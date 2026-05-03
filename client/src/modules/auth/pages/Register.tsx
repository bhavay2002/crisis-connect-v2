import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { AlertTriangle, Loader2, Eye, EyeOff, Lock, Mail, User, Check, X, ArrowRight } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type RegisterFormData = z.infer<typeof registerSchema>;

const ROLES = [
  { value: "citizen",    label: "Citizen",        desc: "Report & track incidents"      },
  { value: "volunteer",  label: "Volunteer",       desc: "Respond to emergencies"        },
  { value: "ngo",        label: "NGO / Aid Org",   desc: "Coordinate relief efforts"     },
  { value: "government", label: "Government",      desc: "Official emergency management" },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const password = form.watch("password") || "";
  const checks = {
    length:    password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  };

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) =>
      apiRequest<{ user: any; accessToken: string; refreshToken: string }>("/api/auth/register", {
        method: "POST", body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      }),
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.accessToken);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Account created! Welcome to CrisisConnect." });
      setLocation("/role-selection");
    },
    onError: (error: any) =>
      toast({ variant: "destructive", title: "Registration failed", description: error.message || "An error occurred." }),
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl">CrisisConnect</span>
          </Link>
          <h1 className="text-2xl font-black">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join the emergency response community</p>
        </div>

        <div className="bg-background border rounded-2xl shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => registerMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Jane Smith" className="pl-10 h-11" data-testid="input-name" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" placeholder="jane@example.com" className="pl-10 h-11" data-testid="input-email" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11" data-testid="input-password" {...field} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  {password && (
                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                      {[
                        { met: checks.length,    text: "8+ characters"  },
                        { met: checks.lowercase, text: "Lowercase"       },
                        { met: checks.uppercase, text: "Uppercase"       },
                        { met: checks.number,    text: "Number"          },
                      ].map(({ met, text }) => (
                        <div key={text} className={`flex items-center gap-1 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}>
                          {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}{text}
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 h-11" data-testid="input-confirm-password" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={registerMutation.isPending} data-testid="button-register">
                {registerMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : <>Create account <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-sm text-center text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link href="/login"><a className="text-red-600 font-semibold hover:underline" data-testid="link-login">Sign in</a></Link>
        </p>
      </div>
    </div>
  );
}
