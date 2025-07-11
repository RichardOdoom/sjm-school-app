
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from 'next/link';
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
import { ADMIN_LOGGED_IN_KEY } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export function AdminLoginForm() {
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

  const handleInputChange = () => {
    if (loginError) {
      setLoginError(null);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    try {
      const processedEmail = values.email.toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: processedEmail,
        password: values.password,
      });

      if (error) {
        await supabase.auth.signOut().catch(console.error);
        const lowerCaseErrorMessage = error.message.toLowerCase();
        if (lowerCaseErrorMessage.includes("invalid login credentials")) {
          setLoginError("Invalid email or password. Please check your credentials and try again.");
        } else if (lowerCaseErrorMessage.includes("email not confirmed")) {
          setLoginError("This admin account's email has not been confirmed. Please check your inbox for a confirmation link.");
        } else {
          setLoginError(`An unexpected error occurred: ${error.message}`);
        }
        return;
      }

      // The role check has been removed from here. The DashboardLayout will now handle role verification.
      // If the login is successful, we proceed.

      if (data.user && data.session) {
        if (typeof window !== 'undefined') {
          // Set a flag that the DashboardLayout can check immediately.
          localStorage.setItem(ADMIN_LOGGED_IN_KEY, "true");
        }
        const displayName = data.user.user_metadata?.full_name || "Admin";
        toast({
          title: "Login Successful",
          description: `Welcome back, ${displayName}! Redirecting to dashboard...`,
        });
        // Redirect to the dashboard where the definitive role check will happen.
        router.push("/admin/dashboard");
      } else {
        await supabase.auth.signOut().catch(console.error);
        setLoginError("Could not log in. User or session data missing.");
      }
    } catch (error: any) { 
      await supabase.auth.signOut().catch(console.error);
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        setLoginError("Could not connect to the server. Please check your internet connection and ensure the Supabase URL in your .env file is correct.");
      } else {
        setLoginError("An unexpected error occurred. Please try again.");
      }
    }
  }

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
                    <Input placeholder="admin@example.com" {...field} onChange={(e) => { field.onChange(e); handleInputChange(); }} />
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
                    <Input type="password" placeholder="••••••••" {...field} onChange={(e) => { field.onChange(e); handleInputChange(); }}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm">
                <Link href="/auth/forgot-password"
                    className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                    Forgot Password?
                </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
