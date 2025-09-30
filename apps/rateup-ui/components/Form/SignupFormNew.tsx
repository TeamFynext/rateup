import { useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Building,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Shield,
  Target,
} from "lucide-react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkboxnew";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import styles from "./AuthForm.module.css";
import GoogleSignInButton from "./GoogleSigninButton";

export function SignUpFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-full p-4">
      <div className="text-center mb-1">
        <div className="flex items-center justify-center mb-1">
          <img
            src="https://djd7kjh9uwow0.cloudfront.net/images/rateup-logo-blue-text.svg"
            alt="RateUp Logo"
            className="w-18 h-auto"
          />
        </div>
        <h2 className="text-lg text-gray-900 mb-1">Welcome to RateUp</h2>
        <p className="text-sm text-gray-600">
          Set up your account in just a few steps
        </p>
      </div>
      <div className="max-w-2xl">
        {/* progress bar */}
        <div className="mb-2 sm:min-w-xl max-w-2xl">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Card className="flex flex-col items-center px-6 py-4 sm:min-w-xl max-w-2xl">
          <Step2 />
          <div className="flex justify-between pt-3 border-t border-gray-200 w-full">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-sm border-2 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              className="flex items-center px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === totalSteps ? "Complete Setup" : "Continue"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Step1() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreesToTerms, setAgreesToTerms] = useState(true);
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="text-center mb-3">
        <h2 className="text-lg text-gray-900 mb-1">Create Your Account</h2>
        <p className="text-sm text-gray-600">Start your journey with RateUp</p>
      </div>
      <GoogleSignInButton
        className={styles["login-signup-with-google-btn"]}
        buttonText={"Continue with Google"}
      />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">
            Or continue with email
          </span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-gray-700 text-sm">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-10 h-8 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-gray-700 text-sm">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              className="pl-10 pr-10 h-8 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword" className="text-gray-700 text-sm">
            Confirm Password
          </Label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              className="pl-10 pr-10 h-8 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Terms checkbox - always show */}
      <div className="flex items-center space-x-3">
        <Checkbox
          id="terms"
          checked={agreesToTerms}
          onCheckedChange={(checked) => setAgreesToTerms(checked as boolean)}
          className="border-2 border-gray-300 h-4 w-4 flex-shrink-0"
        />
        <Label
          htmlFor="terms"
          className="text-xs text-gray-600 leading-relaxed cursor-pointer"
        >
          I agree to the{" "}
          <span className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
            Privacy Policy
          </span>
        </Label>
      </div>
      <div className="w-full text-center pt-2 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          Already have an account?{" "}
          <button
            type="button"
            className="text-rateup-blue hover:text-rateup-blue/80 underline transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

function Step2() {
  const industries = [
    "E-commerce",
    "Retail",
    "Restaurant & Food",
    "Healthcare",
    "Education",
    "Real Estate",
    "Financial Services",
    "Travel & Tourism",
    "Technology",
    "Other",
  ];

  const locations = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Germany",
    "France",
    "Spain",
    "Italy",
    "Netherlands",
    "Sweden",
    "Norway",
    "Denmark",
    "Singapore",
    "India",
    "Brazil",
    "Mexico",
    "Other",
  ];
  return (
    <div className="w-full">
      <div className="text-center mb-3">
        <div className="w-10 h-8 bg-gradient-to-r from-orange-100 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
          <Building className="w-5 h-5 text-orange-600" />
        </div>
        <h2 className="text-lg text-gray-900 mb-1">
          Tell Us About Your Business
        </h2>
        <p className="text-sm text-gray-600">
          Help us customize your RateUp experience
        </p>
      </div>

      <div className="flex flex-col justify-center w-full gap-2">
        <div className="space-y-1">
          <Label htmlFor="businessName" className="text-gray-700 text-sm">
            Business Name
          </Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="businessName"
              placeholder="Your Company Name"
              className="pl-10 h-8 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="website" className="text-gray-700 text-sm">
            Website URL
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="website"
              placeholder="https://yourcompany.com"
              className="pl-10 h-8 border-2 border-gray-200 focus:border-rateup-blue focus:ring-rateup-blue/20 bg-white text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-gray-700 text-sm">Industry</Label>
          <Select>
            <SelectTrigger className="w-full h-7 border-2 border-gray-200 focus:border-orange-500 bg-white text-sm">
              <SelectValue placeholder="Select Your Industry" />
            </SelectTrigger>
            <SelectContent side="bottom" align="start">
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-gray-700 text-sm">Location</Label>
          <Select>
            <SelectTrigger className="w-full h-7 border-2 border-gray-200 focus:border-orange-500 bg-white text-sm">
              <SelectValue placeholder="Select Your Location" />
            </SelectTrigger>
            <SelectContent side="bottom" align="start">
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-3 mt-4">
        <div className="flex items-start space-x-3">
          <Target className="w-4 h-4 text-orange-600 mt-0.5" />
          <div>
            <p className="text-sm text-orange-800">Personalized setup ahead</p>
            <p className="text-xs text-orange-600 mt-1">
              We'll tailor your dashboard and features based on your business
              details
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
