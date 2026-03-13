import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import knpLogo from "@/assets/knp-logo.png";

const EmailVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");

  const handleVerify = async () => {
    if (!token) return;
    setVerifying(true);
    try {
      await api.post("/api/auth/verify-email", { token });
      setVerified(true);
      toast.success("Email verified successfully!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Verification failed";
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    setResending(true);
    try {
      await api.post("/api/auth/resend-verification", { email: email.trim() });
      toast.success("Verification email sent!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to resend";
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
          <p className="text-sm text-muted-foreground mb-6">Your email has been verified successfully. You can now sign in.</p>
          <button
            onClick={() => navigate("/auth")}
            className="w-full h-12 rounded-xl knp-gradient-bg text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <img src={knpLogo} alt="KNP Connect" className="w-16 h-16 rounded-2xl mx-auto mb-4" />

        {token ? (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-2">Verify Your Email</h1>
            <p className="text-sm text-muted-foreground mb-6">Click below to verify your email address.</p>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full h-12 rounded-xl knp-gradient-bg text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {verifying ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify Email"}
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a verification link to your email. Click the link to verify your account.
            </p>
            <div className="mb-4">
              <input
                type="email"
                placeholder="Enter your email to resend"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full h-12 rounded-xl knp-gradient-bg text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mb-3"
            >
              {resending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Resend Verification Email"}
            </button>
          </>
        )}

        <button
          onClick={() => navigate("/auth")}
          className="flex items-center justify-center gap-1 text-sm text-primary font-semibold hover:underline mx-auto mt-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </button>
      </div>
    </div>
  );
};

export default EmailVerification;
