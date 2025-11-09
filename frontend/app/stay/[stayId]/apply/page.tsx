"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Mail, User, Briefcase, Twitter, Linkedin, Wallet, AlertCircle } from "lucide-react";

// Define the form validation schema with Zod
const applySchema = z.object({
  displayName: z.string().min(3, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
});

type ApplyFormInputs = z.infer<typeof applySchema>;

// Wave Divider Component
const WaveDivider: React.FC<{ colorClassName: string; inverted?: boolean }> = ({ colorClassName, inverted = false }) => (
  <div
    className={`w-full h-20 ${colorClassName}`}
    style={{
      maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffffff' fill-opacity='1' d='M0,160L48,181.3C96,203,192,245,288,261.3C384,277,480,267,576,234.7C672,203,768,149,864,138.7C960,128,1056,160,1152,165.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
      maskSize: "cover",
      maskRepeat: "no-repeat",
      transform: inverted ? "scaleY(-1)" : "none",
    }}
  />
);

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const stayId = params.stayId as string;

  const { address, isConnected } = useAccount();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplyFormInputs>({
    resolver: zodResolver(applySchema),
  });

  // Debug: Log the params to see what's available
  useEffect(() => {
    console.log("All params:", params);
    console.log("stayId from params:", stayId);
  }, [params, stayId]);

  const onSubmit: SubmitHandler<ApplyFormInputs> = async (data) => {
    if (!isConnected || !address) {
      setApiError("Please connect your wallet to apply.");
      return;
    }

    // Validate stayId before submitting
    if (!stayId || stayId === "undefined") {
      setApiError(
        "A valid stay ID is missing from the URL. Please check the link."
      );
      console.error("Invalid stayId:", stayId);
      return;
    }

    setApiError(null);

    try {
      console.log("Submitting to:", `/api/stays/${stayId}/apply`);
      console.log("Data:", { ...data, walletAddress: address });

      const response = await fetch(`/api/stays/${stayId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          walletAddress: address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit application");
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Application error:", error);
      setApiError(error.message);
    }
  };

  // Show loading state while params are being resolved
  if (!stayId) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#172a46] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading stay information...</p>
        </div>
      </div>
    );
  }

  // Success State
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f5f5f3]">
        <section className="bg-[#172a46] pt-20 pb-32 relative">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="bg-white rounded-3xl p-12 md:p-16 shadow-2xl">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="text-green-600" size={48} strokeWidth={3} />
              </div>
              <h1 
                className="text-4xl md:text-5xl font-bold text-[#172a46] mb-4"
                style={{ 
                  fontFamily: "'New Rocker', cursive",
                  letterSpacing: '-0.05em'
                }}
              >
                Application Submitted!
              </h1>
              <p className="text-xl text-gray-600 mb-3">
                Your application for <strong className="text-[#172a46]">{stayId}</strong> is now <strong>under review</strong>.
              </p>
              <p className="text-gray-500 mb-8">
                We'll notify you via email and update your dashboard once it's approved. This typically takes 24-48 hours.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard"
                  className="bg-[#172a46] text-white text-lg font-semibold py-4 px-8 rounded-full inline-flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl"
                >
                  <span>View My Dashboard</span>
                  <ArrowRight size={20} />
                </Link>
                <Link
                  href={`/stay/${stayId}`}
                  className="bg-gray-100 text-[#172a46] text-lg font-semibold py-4 px-8 rounded-full inline-flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors"
                >
                  <span>Back to Stay Details</span>
                </Link>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0">
            <WaveDivider colorClassName="bg-[#f5f5f3]" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      {/* Hero Section */}
      <section className="bg-[#172a46] pt-0 pb-32 relative">
        <div className="max-w-4xl mx-auto px-6 pt-12">
          {/* Breadcrumb */}
          <div className="text-gray-300 text-sm mb-8">
            <span className="hover:text-white cursor-pointer">Home</span>
            <span className="mx-2">/</span>
            <span className="hover:text-white cursor-pointer">Stays</span>
            <span className="mx-2">/</span>
            <span className="hover:text-white cursor-pointer">{stayId}</span>
            <span className="mx-2">/</span>
            <span className="text-white">Apply</span>
          </div>

          <div className="text-center text-white mb-12">
            <h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ 
                fontFamily: "'New Rocker', cursive",
                letterSpacing: '-0.05em'
              }}
            >
              Apply for {stayId}
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Fill out the application below. Your wallet address will be used to verify your identity and process payment once approved.
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <WaveDivider colorClassName="bg-[#f5f5f3]" />
        </div>
      </section>

      {/* Form Section */}
      <section className="max-w-3xl mx-auto px-6 -mt-20 relative z-10 pb-20">
        {!isConnected ? (
          // Connect Wallet Card
          <div className="bg-white rounded-3xl p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-[#172a46] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Wallet className="text-white" size={36} />
            </div>
            <h2 className="text-3xl font-bold text-[#172a46] mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please connect your Web3 wallet to begin the application process. We use this to verify your identity and process payments.
            </p>
            <div className="flex justify-center">
              <ConnectKitButton />
            </div>
          </div>
        ) : (
          // Application Form
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Wallet Connected Status */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 p-6">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-green-800">
                  Wallet Connected: {address}
                </span>
                <Check className="text-green-600" size={20} />
              </div>
            </div>

            <div className="p-8 md:p-12 space-y-8">
              {/* Display Name */}
              <div>
                <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                  <User size={20} />
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("displayName")}
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                />
                {errors.displayName && (
                  <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                  <Mail size={20} />
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.email.message}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-2 ml-1">
                  We'll send your application status and updates here
                </p>
              </div>

              {/* Professional Role */}
              <div>
                <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                  <Briefcase size={20} />
                  Professional Role
                </label>
                <input
                  {...register("role")}
                  type="text"
                  placeholder="e.g., Founder, Developer, Designer, Investor"
                  className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                />
                <p className="text-sm text-gray-500 mt-2 ml-1">
                  Help us understand your background in Web3
                </p>
              </div>

              {/* Social Links */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Twitter/X */}
                <div>
                  <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                    <Twitter size={20} />
                    X / Twitter
                  </label>
                  <input
                    {...register("socialTwitter")}
                    type="text"
                    placeholder="@yourusername"
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  />
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                    <Linkedin size={20} />
                    LinkedIn
                  </label>
                  <input
                    {...register("socialLinkedin")}
                    type="text"
                    placeholder="linkedin.com/in/username"
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                <h4 className="font-bold text-[#172a46] mb-2">📋 What Happens Next?</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>✓ We review your application within 24-48 hours</li>
                  <li>✓ You'll receive an email notification with the decision</li>
                  <li>✓ If approved, you'll be able to complete payment via your dashboard</li>
                  <li>✓ Once paid, you're confirmed for the stay!</li>
                </ul>
              </div>

              {/* Error Message */}
              {apiError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-red-800">Error</p>
                    <p className="text-red-700">{apiError}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className={`w-full text-lg font-semibold py-5 rounded-full inline-flex items-center justify-center gap-3 transition-all shadow-xl ${
                  isSubmitting 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#172a46] text-white hover:scale-105'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Application</span>
                    <ArrowRight size={22} />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                By submitting, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}