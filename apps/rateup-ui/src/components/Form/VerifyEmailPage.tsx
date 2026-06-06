"use client";

import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Home,
  Mail,
  Send,
} from "lucide-react";

import { rateupLogoStackedWhiteTransparent } from "@/utils/constants.ts";

import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";

function VerifyEmailPage({ sendEmail }) {
  const [countdown, setCountdown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const handleResendEmail = () => {
    setEmailSent(true);
    setCountdown(60);
    sendEmail();
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      setEmailSent(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-linear-to-br from-blue-50/30 via-gray-50/20 to-orange-50/30 gap-1 p-4">
      <div className="flex flex-col gap-1 items-center justify-center">
        <img
          src={rateupLogoStackedWhiteTransparent}
          alt="RateUp Logo"
          className="w-18 h-auto"
        />
        <h2 className="text-lg text-gray-900 mb-1">Verify Your Email</h2>
        <p className="text-sm text-gray-600">Check your inbox to continue</p>
      </div>
      <Card className="p-4 sm:p-5 shadow-xl border border-gray-100 bg-white mb-8 max-w-md">
        <div className="space-y-3">
          <div className="flex justify-center py-2">
            <div className="relative w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center">
              <Mail className="w-8 h-8 text-rateup-blue" strokeWidth={1.5} />

              {emailSent && (
                <div className="absolute -top-1 -right-1 animate-in zoom-in duration-300">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              We've sent a verification link to your email address.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Link expires in 24 hours</span>
          </div>

          <div className="space-y-2 pt-2">
            {/* Resend Email */}
            <Button
              onClick={() => countdown === 0 && handleResendEmail()}
              disabled={countdown > 0}
              variant="outline"
              className="w-full h-10 border-2 border-gray-300 hover:border-rateup-blue hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white text-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {countdown > 0
                ? `Resend in ${countdown}s`
                : "Resend verification email"}
            </Button>

            <Button
              onClick={() =>
                navigate({
                  to: "/logout",
                })
              }
              variant="outline"
              className="w-full h-10 border-2 border-gray-300 hover:border-rateup-blue hover:bg-blue-50 text-sm"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 mt-3">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-700 leading-relaxed">
                  Didn't receive the email? Check your spam folder or wait a few
                  minutes for delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default VerifyEmailPage;
