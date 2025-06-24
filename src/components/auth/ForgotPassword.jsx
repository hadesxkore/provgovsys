import { useState, useEffect } from 'react';
import { auth, db } from '../../config/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { toast } from "sonner";
import emailjs from '@emailjs/browser';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../ui/input-otp";

// Initialize EmailJS
emailjs.init("SCsg9WSjncPID55No");

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Email input, 2: OTP verification
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  // Generate a random 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate OTP
      const verificationCode = generateOTP();
      
      // Store OTP in Firestore with expiration (10 minutes)
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 10);
      
      await setDoc(doc(db, "password_reset_codes", email), {
        code: verificationCode,
        expiresAt: expirationTime.toISOString(),
        createdAt: new Date().toISOString()
      });

      // Send email with OTP
      await emailjs.send(
        "service_287nkdg",
        "template_iwtajnk",
        {
          to_email: email,
          name: email.split('@')[0],
          message: "Here is your password reset verification code:",
          code: verificationCode,
          time: new Date().toLocaleString()
        },
        "SCsg9WSjncPID55No"
      );

      toast.success("Verification code sent to your email");
      setStep(2);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get stored OTP from Firestore
      const otpDoc = await getDoc(doc(db, "password_reset_codes", email));
      
      if (!otpDoc.exists()) {
        toast.error("Verification code expired or invalid");
        return;
      }

      const { code, expiresAt } = otpDoc.data();
      const now = new Date();
      const expiration = new Date(expiresAt);

      if (now > expiration) {
        toast.error("Verification code has expired");
        await deleteDoc(doc(db, "password_reset_codes", email));
        return;
      }

      if (otp !== code) {
        toast.error("Invalid verification code");
        return;
      }

      // If OTP is valid, send password reset email through Firebase
      try {
        await sendPasswordResetEmail(auth, email);
        toast.success(
          "Password reset email sent! Please check your inbox or spam folder.",
          { duration: 4000 }
        );
        
        // Clean up the used OTP
        await deleteDoc(doc(db, "password_reset_codes", email));
        
        setTimeout(() => {
          navigate('/login');
        }, 4000);
      } catch (firebaseError) {
        console.error("Firebase Error:", firebaseError);
        if (firebaseError.code === 'auth/user-not-found') {
          toast.error("No account found with this email address");
        } else {
          toast.error("Failed to send password reset email. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Professional Gradient Background (60%) */}
      <div className="hidden lg:block lg:w-[60%] relative bg-gradient-to-r from-blue-600 to-blue-500 overflow-hidden">
        {/* Subtle line pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="lines" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lines)" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-16">
          <div className="w-48 h-48 mb-12 relative bg-white rounded-full p-4 shadow-lg">
            <img 
              src={import.meta.env.BASE_URL + 'images/logo.png'}
              alt="Bataan Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01ek0yIDE3bDEwIDUgMTAtNU0yIDEybDEwIDUgMTAtNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
              }}
            />
          </div>
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-semibold text-white tracking-wide">Provincial Government of Bataan</h1>
            <div className="w-24 h-0.5 mx-auto bg-white/30"></div>
            <h2 className="text-lg text-white/80 tracking-wider uppercase">Document Management System</h2>
          </div>
        </div>

        {/* Subtle gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-l from-black/10 to-transparent"></div>
      </div>

      {/* Right Side - Form (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 bg-white">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">
              Reset Password
            </h2>
            <p className="text-sm text-gray-600">
              {step === 1 
                ? "Enter your email to receive a verification code" 
                : "Enter the verification code sent to your email"}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Code...
                  </div>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-4">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  Try with different email
                </Button>
              </div>
            </form>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Remember your password?</span>
            </div>
          </div>

          <div className="text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center justify-center w-full py-2.5 font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
} 