"use client";

import { useState, useEffect } from 'react';
import { ArrowRight, Star, Check, Calendar, Users, DollarSign, MapPin } from 'lucide-react';
import Link from 'next/link';

type StayData = {
  id: string;
  stayId: string;
  title: string;
  slug: string;
  location: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number | null;
  priceUSDC: number;
  priceUSDT: number;
  slotsTotal: number;
  slotsAvailable: number;
  allowWaitlist: boolean;
  images: string[];
  amenities: string[];
  highlights: string[];
  rooms: any[];
};

type Booking = {
  bookingId: string;
  status: string;
};

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

export default function StayDetailsClient({ stay }: { stay: StayData }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [existingBooking, setExistingBooking] = useState<Booking | null>(null);
  const [checkingBooking, setCheckingBooking] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  // Simulate wallet connection check - replace with your actual wallet logic
  useEffect(() => {
    // Check if user has wallet connected
    // This is where you'd integrate with wagmi or your wallet provider
    const checkWallet = async () => {
      // Your wallet check logic here
    };
    checkWallet();
  }, []);

  // Check if user already has a booking for this stay
  useEffect(() => {
    if (!address) {
      setExistingBooking(null);
      return;
    }

    async function checkBooking() {
      try {
        setCheckingBooking(true);
        const res = await fetch(`/api/user/bookings?wallet=${address}`);
        if (res.ok) {
          const bookings = await res.json();
          const booking = bookings.find((b: any) => b.stay && b.stay.id === stay.id);
          setExistingBooking(booking || null);
        }
      } catch (err) {
        console.error('Error checking booking:', err);
      } finally {
        setCheckingBooking(false);
      }
    }

    checkBooking();
  }, [address, stay.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculatedDuration = stay.duration || Math.ceil((new Date(stay.endDate).getTime() - new Date(stay.startDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-[#102E4A]">
      {/* Hero Section with Image Gallery */}
      <section className="relative bg-[#172a46] pt-0 pb-32">
        <div className="max-w-screen-xl mx-auto px-6">
          {/* Breadcrumb */}
          <div className="text-gray-300 text-sm mb-8">
            <span className="hover:text-white cursor-pointer">Home</span>
            <span className="mx-2">/</span>
            <span className="hover:text-white cursor-pointer">Stays</span>
            <span className="mx-2">/</span>
            <span className="text-white">{stay.title}</span>
          </div>

          {/* Image Gallery */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {stay.images && stay.images.length > 0 ? (
              <>
                <div className="h-[500px] rounded-3xl overflow-hidden shadow-2xl">
                  <img 
                    src={stay.images[selectedImage]} 
                    alt={stay.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {stay.images.slice(0, 4).map((img, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`h-[242px] rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-105 shadow-lg ${selectedImage === idx ? 'ring-4 ring-white' : ''}`}
                    >
                      <img 
                        src={img} 
                        alt={`View ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="col-span-2 h-[500px] rounded-3xl bg-gray-300 flex items-center justify-center text-4xl">
                📸 No images yet
              </div>
            )}
          </div>

          {/* Title and Location */}
          <div className="text-white">
            <h1 
              className="text-5xl md:text-6xl font-bold mb-4"
              style={{ 
                fontFamily: "'New Rocker', cursive",
                letterSpacing: '-0.05em'
              }}
            >
              {stay.title}
            </h1>
            <div className="flex items-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <MapPin size={20} />
                <span>{stay.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={20} />
                <span>{formatDate(stay.startDate)} - {formatDate(stay.endDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <WaveDivider colorClassName="bg-[#f5f5f3]" />
        </div>
      </section>

      {/* Key Stats Section */}
      <section className="max-w-screen-xl mx-auto px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#172a46] rounded-2xl mb-4">
              <DollarSign className="text-white" size={32} />
            </div>
            <div className="text-4xl font-bold text-[#172a46] mb-2">
              ${stay.priceUSDC}
            </div>
            <div className="text-sm text-gray-600">Price in USDC</div>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#172a46] rounded-2xl mb-4">
              <Users className="text-white" size={32} />
            </div>
            <div className="text-4xl font-bold text-[#172a46] mb-2">
              {stay.slotsAvailable}/{stay.slotsTotal}
            </div>
            <div className="text-sm text-gray-600">Slots Available</div>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#172a46] rounded-2xl mb-4">
              <Calendar className="text-white" size={32} />
            </div>
            <div className="text-4xl font-bold text-[#172a46] mb-2">
              {calculatedDuration}
            </div>
            <div className="text-sm text-gray-600">Days</div>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#172a46] rounded-2xl mb-4">
              <Star className="text-white" fill="white" size={32} />
            </div>
            <div className="text-4xl font-bold text-[#172a46] mb-2">
              4.9
            </div>
            <div className="text-sm text-gray-600">Guest Rating</div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="max-w-screen-xl mx-auto px-6 py-20">
        <h2 
          className="text-4xl md:text-5xl font-bold text-[#172a46] mb-8"
          style={{ 
            fontFamily: "'New Rocker', cursive",
            letterSpacing: '-0.05em'
          }}
        >
          About This Stay
        </h2>
        <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line max-w-4xl">
          {stay.description}
        </p>
      </section>

      {/* Amenities & Highlights Grid */}
      <section className="bg-[#172a46] py-20 relative">
        <div className="absolute -top-20 left-0 right-0">
          <WaveDivider colorClassName="bg-[#172a46]" inverted />
        </div>
        
        <div className="max-w-screen-xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Amenities */}
            {stay.amenities && stay.amenities.length > 0 && (
              <div>
                <h3 className="text-3xl font-bold text-white mb-8">
                  What's Included
                </h3>
                <div className="space-y-4">
                  {stay.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-white">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Check size={16} />
                      </div>
                      <span className="text-lg text-gray-200">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Highlights */}
            {stay.highlights && stay.highlights.length > 0 && (
              <div>
                <h3 className="text-3xl font-bold text-white mb-8">
                  What to Expect
                </h3>
                <div className="space-y-4">
                  {stay.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-white">
                      <div className="text-2xl flex-shrink-0">🎯</div>
                      <span className="text-lg text-gray-200">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0">
          <WaveDivider colorClassName="bg-[#f5f5f3]" />
        </div>
      </section>

      {/* Room Options */}
      {stay.rooms && stay.rooms.length > 0 && (
        <section className="max-w-screen-xl mx-auto px-6 py-20">
          <h2 
            className="text-4xl md:text-5xl font-bold text-[#172a46] mb-12 text-center"
            style={{ 
              fontFamily: "'New Rocker', cursive",
              letterSpacing: '-0.05em'
            }}
          >
            Room Options
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {stay.rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
                {room.images && room.images.length > 0 ? (
                  <div className="h-64">
                    <img 
                      src={room.images[0]} 
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-gray-200 flex items-center justify-center text-4xl">
                    🛏️
                  </div>
                )}
                <div className="p-8">
                  <h4 className="text-2xl font-bold text-[#172a46] mb-3">
                    {room.name}
                  </h4>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {room.description}
                  </p>
                  <div className="flex items-center gap-2 text-gray-500 mb-4">
                    <Users size={18} />
                    <span>{room.capacity} {room.capacity === 1 ? 'person' : 'people'}</span>
                  </div>
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {room.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-3xl font-bold text-[#172a46]">
                    ${room.price} <span className="text-lg text-gray-500">USDC</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 
            className="text-4xl md:text-5xl font-bold text-[#172a46] mb-12 text-center"
            style={{ 
              fontFamily: "'New Rocker', cursive",
              letterSpacing: '-0.05em'
            }}
          >
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-8">
            <div className="border-b border-gray-200 pb-8">
              <h4 className="text-xl font-bold text-[#172a46] mb-3">
                What's the application process?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Submit your application → Wait for approval (24-48h) → Pay with crypto → You're in!
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-8">
              <h4 className="text-xl font-bold text-[#172a46] mb-3">
                What payment methods do you accept?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                We accept USDC and USDT on BSC network. You'll need a crypto wallet like MetaMask.
              </p>
            </div>
            
            <div className="pb-8">
              <h4 className="text-xl font-bold text-[#172a46] mb-3">
                What's your cancellation policy?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Full refund if cancelled 14+ days before. 50% refund if 7-14 days before. No refund within 7 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#172a46] py-24 relative">
        <div className="absolute -top-20 left-0 right-0">
          <WaveDivider colorClassName="bg-[#172a46]" inverted />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          {checkingBooking ? (
            <div className="bg-white rounded-3xl p-12">
              <p className="text-xl text-gray-600">Checking your application status...</p>
            </div>
          ) : existingBooking ? (
            <div className="bg-white rounded-3xl p-12">
              <div className="text-6xl mb-6">✅</div>
              <h2 className="text-4xl font-bold text-[#172a46] mb-4">
                You've Already Applied!
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Your application status: <strong className="text-[#172a46]">{existingBooking.status}</strong>
              </p>
              {existingBooking.status === 'PENDING' && (
                <Link 
                  href={`/booking/${existingBooking.bookingId}`}
                  className="bg-[#10b981] text-white text-lg font-semibold py-4 px-10 rounded-full inline-flex items-center gap-3 hover:scale-105 transition-transform shadow-xl"
                >
                  <span>Complete Payment</span>
                  <ArrowRight size={20} />
                </Link>
              )}
              {existingBooking.status === 'WAITLISTED' && (
                <p className="text-gray-600 mt-4">
                  We'll notify you within 24-48 hours about your application status.
                </p>
              )}
              {existingBooking.status === 'CONFIRMED' && (
                <Link 
                  href="/dashboard"
                  className="bg-[#6366f1] text-white text-lg font-semibold py-4 px-10 rounded-full inline-flex items-center gap-3 hover:scale-105 transition-transform shadow-xl"
                >
                  <span>View My Bookings</span>
                  <ArrowRight size={20} />
                </Link>
              )}
            </div>
          ) : stay.allowWaitlist && stay.slotsAvailable > 0 ? (
            <>
              <h2 
                className="text-5xl md:text-6xl font-bold text-white mb-6"
                style={{ 
                  fontFamily: "'New Rocker', cursive",
                  letterSpacing: '-0.05em'
                }}
              >
                Ready to Join?
              </h2>
              <p className="text-2xl text-gray-300 mb-8">
                Only {stay.slotsAvailable} slots remaining
              </p>
              <Link
                href={`/stay/${stay.stayId}/apply`}
                className="bg-white text-[#172a46] text-lg font-semibold py-5 px-12 rounded-full inline-flex items-center gap-3 hover:scale-105 transition-transform shadow-2xl mb-6"
              >
                <span>Apply Now</span>
                <ArrowRight size={22} />
              </Link>
              <p className="text-gray-300 text-sm">
                💡 Applications are reviewed within 24-48 hours
              </p>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-12">
              <div className="text-6xl mb-6">😔</div>
              <h2 className="text-4xl font-bold text-[#172a46] mb-4">
                Applications Closed
              </h2>
              <p className="text-xl text-gray-600">
                This stay is no longer accepting applications.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}