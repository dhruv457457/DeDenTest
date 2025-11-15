// File: app/stay/[stayId]/apply/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  Mail,
  User,
  Briefcase,
  Twitter,
  Linkedin,
  Wallet,
  AlertCircle,
  LogIn,
  Phone,
  Users as UsersIcon,
  DollarSign, // New Icon for currency
} from "lucide-react";

// ✅ FIXED ZOD SCHEMA with Refinement
const applySchema = z
  .object({
    displayName: z.string().min(3, "Name is required"),
    email: z.string().email("Invalid email address"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),

    gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], {
      message: "Please select your gender",
    }),
    age: z
      .number()
      .min(18, "You must be at least 18 years old")
      .max(120, "Invalid age"),
    mobileNumber: z.string().min(10, "Valid mobile number is required"),

    // ROOM SELECTION
    selectedRoomId: z.string().optional(),
    // CURRENCY SELECTION
    selectedCurrency: z.string().optional(),

    role: z.string().optional(),
    socialTwitter: z.string().optional(),
    socialLinkedin: z.string().optional(),
    socialTelegram: z.string().optional(),
  })
  .refine(
    (data) => {
      // If a room is selected (not empty string), check for currency selection
      if (data.selectedRoomId && data.selectedRoomId !== "") {
        return ["USDC", "USDT"].includes(data.selectedCurrency as string);
      }
      // If no room is selected, currency can be anything (including undefined/empty)
      return true;
    },
    {
      message:
        "Please select a payment currency (USDC or USDT) for your preferred room.",
      path: ["selectedCurrency"],
    }
  );

type ApplyFormInputs = z.infer<typeof applySchema>;

// Wave Divider Component (Kept as is)
const WaveDivider: React.FC<{ colorClassName: string; inverted?: boolean }> = ({
  colorClassName,
  inverted = false,
}) => (
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

  // NextAuth session
  const { data: session, status: sessionStatus } = useSession();

  // Wallet connection
  const { address, isConnected } = useAccount();

  const [apiError, setApiError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [stayRooms, setStayRooms] = useState<any[]>([]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isSuccess]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<ApplyFormInputs>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      selectedRoomId: "",
      selectedCurrency: "", // Initialize selected currency
    },
  });

  // Watch for the current values
  const currentSelectedRoomId = watch("selectedRoomId");
  const currentSelectedCurrency = watch("selectedCurrency");

  // Custom function to handle combined room and currency selection
  const handleRoomSelection = (
    roomId: string,
    currency: "USDC" | "USDT" | null
  ) => {
    // If selecting "No Preference"
    if (!roomId) {
      setValue("selectedRoomId", "");
      setValue("selectedCurrency", "");
    } else {
      // If clicking on a new room/currency combo
      setValue("selectedRoomId", roomId);
      setValue("selectedCurrency", currency || "", { shouldValidate: true });
    }
  };

  // Fetch stay data to get rooms (kept as is)
  useEffect(() => {
    const fetchStayData = async () => {
      try {
        const response = await fetch(`/api/stays/${stayId}`);
        if (response.ok) {
          const data = await response.json();
          // Assuming rooms now have priceUSDC and priceUSDT
          setStayRooms(data.rooms?.filter((room: any) => room) || []);
        }
      } catch (error) {
        console.error("Error fetching stay data:", error);
      }
    };

    if (stayId && stayId !== "undefined") {
      fetchStayData();
    }
  }, [stayId]);

  // Pre-fill form with session data (kept as is)
  useEffect(() => {
    if (session?.user) {
      const sessionUser = session.user as any;

      reset({
        displayName: sessionUser.name || "",
        email: sessionUser.email || "",
        firstName: sessionUser.firstName || "",
        lastName: sessionUser.lastName || "",
        role: sessionUser.role || "",
        gender: applySchema.shape.gender.safeParse(sessionUser.gender).success
          ? sessionUser.gender
          : undefined,
        age:
          !isNaN(parseFloat(sessionUser.age)) && isFinite(sessionUser.age)
            ? Number(sessionUser.age)
            : undefined,
        mobileNumber: sessionUser.mobileNumber || "",
        socialTwitter: sessionUser.socialTwitter || "",
        socialLinkedin: sessionUser.socialLinkedin || "",
        socialTelegram: sessionUser.socialTelegram || "",
        // Reset room/currency on prefill
        selectedRoomId: "",
        selectedCurrency: "",
      });
    }
  }, [session, reset]);

  const onSubmit: SubmitHandler<ApplyFormInputs> = async (data) => {
    // Authentication checks (kept as is)
    if (sessionStatus !== "authenticated") {
      setApiError("Please sign in to apply for this stay.");
      return;
    }

    if (!isConnected || !address) {
      setApiError(
        "Please connect your wallet to complete your application. This is required for payment processing."
      );
      return;
    }

    if (!stayId || stayId === "undefined") {
      setApiError("Invalid stay ID. Please check the URL and try again.");
      console.error("Invalid stayId:", stayId);
      return;
    }

    setApiError(null);

    try {
      console.log("Submitting application to:", `/api/stays/${stayId}/apply`);
      console.log("Data:", { ...data, walletAddress: address });

      const response = await fetch(`/api/stays/${stayId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          walletAddress: address,
          // If no room is selected, clear currency just in case
          selectedCurrency: data.selectedRoomId ? data.selectedCurrency : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            "You have already applied for this stay. Check your dashboard for status."
          );
        }
        throw new Error(result.error || "Failed to submit application");
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Application error:", error);
      setApiError(error.message);
    }
  };

  // ... (Loading state and Success State kept as is)

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

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#E7E4DF]">
        <section className="bg-[#E7E4DF] pt-20 pb-32 relative h-full">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="bg-[#172a46] rounded-3xl p-12 md:p-16 shadow-2xl">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="text-green-600" size={48} strokeWidth={3} />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#E7E4DF] mb-4">
                Application Submitted!
              </h1>
              <p className="text-xl text-gray-400 mb-3">
                Your application for{" "}
                <strong className="text-[#E7E4DF]">{stayId}</strong> is now{" "}
                <strong>under review</strong>.
              </p>
              <p className="text-gray-300 mb-8">
                We'll notify you via email and update your dashboard once it's
                approved. This typically takes 24-48 hours.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard"
                  className="bg-[#E7E4DF] text-[#172a46] text-lg font-semibold py-4 px-8 rounded-full inline-flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl"
                >
                  <span>View My Dashboard</span>
                  <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E7E4DF]">
      {/* Hero Section */}
      <section className="bg-[#172a46] pt-0 pb-32 relative">
        <div className=" mx-auto px-6 pt-12 md:px-38 ">
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Apply for {stayId}
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Complete your application below. You need to be signed in and have
              a wallet connected for payment processing.
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="bg-[#172a46] md:px-80 mx-auto px-6 -mt-20 relative z-10 pb-20">
        {/* Authentication Handling (kept as is) */}
        {sessionStatus === "unauthenticated" && (
          <div className="bg-white rounded-3xl p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-[#172a46] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <LogIn className="text-white" size={36} />
            </div>
            <h2 className="text-3xl font-bold text-[#172a46] mb-4">
              Sign In Required
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please sign in with your wallet or Gmail to begin the application
              process.
            </p>
            <Link
              href="/auth/signin"
              className="bg-[#172a46] text-white text-lg font-semibold py-4 px-8 rounded-full inline-flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl"
            >
              <span>Sign In</span>
              <ArrowRight size={20} />
            </Link>
          </div>
        )}

        {sessionStatus === "loading" && (
          <div className="bg-white rounded-3xl p-12 shadow-2xl text-center">
            <div className="w-16 h-16 border-4 border-[#172a46] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Verifying authentication...</p>
          </div>
        )}

        {sessionStatus === "authenticated" && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Authentication Status (kept as is) */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 p-6">
              <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
                <Check className="text-green-600" size={20} />
                <span className="font-semibold text-green-800">
                  Signed in as: {session.user?.email}
                </span>
              </div>

              {/* Wallet Connection Status (kept as is) */}
              {isConnected && address ? (
                <div className="flex items-center justify-center gap-3 flex-wrap text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700">
                    Wallet: {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className="text-yellow-600 flex-shrink-0 mt-0.5"
                      size={20}
                    />
                    <div>
                      <p className="font-semibold text-yellow-800 mb-2">
                        Wallet Not Connected
                      </p>
                      <p className="text-yellow-700 text-sm mb-3">
                        Connect your wallet to complete the application. This is
                        required for payment processing.
                      </p>
                      <ConnectKitButton />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="p-8 md:p-12 space-y-8"
            >
              {/* Display Name, Email, Gender, Age, Mobile Number (kept as is) */}
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

              <div>
                <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("gender")}
                  className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors bg-white"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.gender.message}
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("age", { valueAsNumber: true })}
                    type="number"
                    min="18"
                    max="120"
                    placeholder="e.g., 25"
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  />
                  {errors.age && (
                    <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.age.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                    <Phone size={20} />
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("mobileNumber")}
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  />
                  {errors.mobileNumber && (
                    <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.mobileNumber.message}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-2 ml-1">
                    Include country code (e.g., +91 for India)
                  </p>
                </div>
              </div>

              {/* ✅ UPDATED: Room & Currency Selection */}
              {stayRooms && stayRooms.length > 0 && (
                <div>
                  <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                    <UsersIcon size={20} />
                    Preferred Room & Currency (Optional)
                  </label>
                  <div className="space-y-4">
                    {stayRooms.map((room: any) => (
                      <div
                        key={room.id}
                        className={`border-2 rounded-2xl p-5 transition-all ${
                          currentSelectedRoomId === room.id
                            ? "border-[#172a46] bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-[#172a46] text-lg">
                            {room.name}
                          </h4>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {room.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                          <UsersIcon size={16} />
                          <span>Capacity: {room.capacity}</span>
                        </div>

                        {/* Currency Selection for the Room */}
                        <div className="mt-4 border-t border-gray-200 pt-3">
                          <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                            <DollarSign size={16} /> Select Payment Currency:
                          </p>
                          <div className="flex gap-4">
                            {/* USDC Option */}
                            <label
                              className={`flex items-center justify-center p-3 flex-1 border-2 rounded-xl cursor-pointer transition-all ${
                                currentSelectedRoomId === room.id &&
                                currentSelectedCurrency === "USDC"
                                  ? "border-green-600 bg-green-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              onClick={() =>
                                handleRoomSelection(room.id, "USDC")
                              }
                            >
                              <input
                                type="radio"
                                name={`room_currency_${room.id}`}
                                className="sr-only"
                                checked={
                                  currentSelectedRoomId === room.id &&
                                  currentSelectedCurrency === "USDC"
                                }
                                readOnly
                              />
                              <div>
                                <div className="font-bold text-md text-green-700">
                                  {room.priceUSDC || room.price || "N/A"} USDC
                                </div>
                              </div>
                            </label>

                            {/* USDT Option */}
                            <label
                              className={`flex items-center justify-center p-3 flex-1 border-2 rounded-xl cursor-pointer transition-all ${
                                currentSelectedRoomId === room.id &&
                                currentSelectedCurrency === "USDT"
                                  ? "border-purple-600 bg-purple-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              onClick={() =>
                                handleRoomSelection(room.id, "USDT")
                              }
                            >
                              <input
                                type="radio"
                                name={`room_currency_${room.id}`}
                                className="sr-only"
                                checked={
                                  currentSelectedRoomId === room.id &&
                                  currentSelectedCurrency === "USDT"
                                }
                                readOnly
                              />
                              <div>
                                <div className="font-bold text-md text-purple-700">
                                  {room.priceUSDT || room.price || "N/A"} USDT
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* No Room Preference Option */}
                    <label
                      className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all block ${
                        currentSelectedRoomId === ""
                          ? "border-gray-400 bg-gray-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleRoomSelection("", null)}
                    >
                      <input
                        type="radio"
                        {...register("selectedRoomId")}
                        value=""
                        className="sr-only"
                      />
                      <h4 className="font-bold text-gray-600 text-lg mb-1">
                        No Room Preference (Default)
                      </h4>
                      <p className="text-sm text-gray-500">
                        I will accept any available room, and the currency will
                        be determined upon approval.
                      </p>
                      {currentSelectedRoomId === "" && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Currency Error Message */}
                  {currentSelectedRoomId &&
                    currentSelectedRoomId !== "" &&
                    errors.selectedCurrency && (
                      <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {errors.selectedCurrency.message}
                      </p>
                    )}
                  {/* General Room ID error is no longer strictly needed due to refinement */}

                  <p className="text-sm text-gray-500 mt-2 ml-1">
                    If you select a preferred room, you must also select a
                    payment currency.
                  </p>
                </div>
              )}

              {/* Name Fields, Professional Role, Social Links, Info Box (kept as is) */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                    First Name
                  </label>
                  <input
                    {...register("firstName")}
                    type="text"
                    placeholder="First name"
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                    Last Name
                  </label>
                  <input
                    {...register("lastName")}
                    type="text"
                    placeholder="Last name"
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  />
                </div>
              </div>

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

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                    <Twitter size={20} />X / Twitter
                  </label>
                  <input
                    {...register("socialTwitter")}
                    type="text"
                    placeholder="@yourusername"
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  />
                </div>

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

              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                <h4 className="font-bold text-[#172a46] mb-2">
                  📋 What Happens Next?
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li>✓ We review your application within 24-48 hours</li>
                  <li>
                    ✓ You'll receive an email notification with the decision
                  </li>
                  <li>
                    ✓ If approved, you'll be able to complete payment via your
                    dashboard
                  </li>
                  <li>✓ Once paid, you're confirmed for the stay!</li>
                </ul>
              </div>

              {/* Error Message (kept as is) */}
              {apiError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle
                    className="text-red-600 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <div>
                    <p className="font-bold text-red-800">Error</p>
                    <p className="text-red-700">{apiError}</p>
                  </div>
                </div>
              )}

              {/* Submit Button (kept as is) */}
              <button
                type="submit"
                disabled={isSubmitting || !isConnected}
                className={`w-full text-lg font-semibold py-5 rounded-full inline-flex items-center justify-center gap-3 transition-all shadow-xl ${
                  isSubmitting || !isConnected
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#172a46] text-white hover:scale-105"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting Application...</span>
                  </>
                ) : !isConnected ? (
                  <>
                    <Wallet size={20} />
                    <span>Connect Wallet to Continue</span>
                  </>
                ) : (
                  <>
                    <span>Submit Application</span>
                    <ArrowRight size={22} />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                By submitting, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
