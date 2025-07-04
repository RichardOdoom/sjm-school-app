
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }).trim(),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export function StudentLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    try {
      const processedEmail = values.email.toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: processedEmail,
        password: values.password,
      });

      if (authError) {
        await supabase.auth.signOut().catch(console.error);
        const lowerCaseErrorMessage = authError.message.toLowerCase();
        if (lowerCaseErrorMessage.includes("invalid login credentials")) {
          console.warn(`Student login failed for ${processedEmail}: Invalid credentials.`);
          setLoginError("Invalid email or password. Please check your credentials and try again.");
        } else if (lowerCaseErrorMessage.includes("email not confirmed")) {
          console.warn(`Student login failed for ${processedEmail}: Email not confirmed.`);
          setLoginError("Your email has not been confirmed. Please check your inbox for a confirmation link.");
        } else {
          console.error("Unexpected student login error:", authError);
          setLoginError(`An unexpected error occurred: ${authError.message}`);
        }
        return;
      }
      
      if (authData.user && authData.session) {
        const { data: studentProfile, error: profileError } = await supabase
          .from('students')
          .select('full_name, auth_user_id')
          .eq('auth_user_id', authData.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          await supabase.auth.signOut().catch(console.error);
          console.error("Error fetching student profile after login:", profileError);
          setLoginError("Could not verify student profile after login. Please contact admin.");
          return;
        }

        if (!studentProfile) {
          await supabase.auth.signOut().catch(console.error);
          setLoginError("No student profile associated with this login account. Please contact admin.");
          return;
        }

        toast({
          title: "Login Successful",
          description: `Welcome back, ${studentProfile.full_name || authData.user.email}! Redirecting to your dashboard...`,
        });
        router.push("/student/dashboard");

      } else {
         await supabase.auth.signOut().catch(console.error);
         setLoginError("Could not log in. User or session data missing.");
      }

    } catch (error: any) {
      await supabase.auth.signOut().catch(console.error);
      console.error("Student login error (General):", error);
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        setLoginError("Could not connect to the server. Please check your internet connection and ensure the Supabase URL in your .env file is correct.");
      } else {
        setLoginError(`An unexpected error occurred: ${error.message || 'Unknown error'}.`);
      }
    }
  }

  const handleInputChange = () => {
    if (loginError) {
      setLoginError(null);
    }
  };

  return (
    <Card className="shadow-xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="your-email@example.com" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Verifying..." : "Login"}
            </Button>
            <Link href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
                Forgot Password?
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
