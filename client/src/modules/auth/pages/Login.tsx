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
import { AlertTriangle, Loader2, Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import heroImage from "@assets/generated_images/Emergency_response_team_coordination_9097dcd9.png";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) =>
      apiRequest<{ user: any; accessToken: string; refreshToken: string }>("/api/auth/login", {
        method: "POST", body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Welcome back!" });
      setLocation("/dashboard");
    },
    onError: (error: any) =>
      toast({ variant: "destructive", title: "Login failed", description: error.message || "Invalid credentials." }),
  });

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="bg" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/90 to-red-950/50" />
        </div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white text-lg">CrisisConnect</span>
          </Link>
        </div>
        <div className="relative z-10">
          <blockquote className="text-white">
            <p className="text-2xl font-bold leading-snug mb-4">
              "The platform that combines AI intelligence with human oversight to save lives."
            </p>
            <p className="text-slate-400 text-sm">Research-grade disaster management — §1–§18 complete</p>
          </blockquote>
        </div>
        <div className="relative z-10 flex gap-6 text-sm text-slate-500">
          <span>256-bit Encryption</span>
          <span>·</span>
          <span>GDPR Compliant</span>
          <span>·</span>
          <span>24/7 Live</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-lg">CrisisConnect</span>
          </div>

          <h1 className="text-2xl font-black mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">Sign in to your command center</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => loginMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" placeholder="admin@test.com" className="pl-10 h-11" data-testid="input-email" {...field} />
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
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={loginMutation.isPending} data-testid="button-login">
                {loginMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          </Form>

          {/* Demo credentials */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-dashed">
            <p className="text-xs text-muted-foreground text-center mb-1 font-semibold">Demo credentials</p>
            <p className="text-xs text-center font-mono text-muted-foreground">admin@test.com / Admin1234!</p>
          </div>

          <p className="text-sm text-center text-muted-foreground mt-6">
            No account?{" "}
            <Link href="/register" className="text-red-600 font-semibold hover:underline" data-testid="link-register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
