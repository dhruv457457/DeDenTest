"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import { ConnectKitButton } from "connectkit";
import { User, Twitter, Linkedin } from "lucide-react";

// This type defines the shape of the data from our new API
type Guest = {
  displayName: string;
  role: string | null;
  socialTwitter: string | null;
  socialLinkedin: string | null;
};

// This type is for the /api/user/bookings response
type UserBooking = {
  bookingId: string;
  status: string;
  stay: {
    stayId: string;
  };
};

type AuthStatus = "loading" | "unauthorized" | "authorized" | "error";

export default function GuestListPage() {
  const params = useParams();
  const stayId = params.stayId as string;
  const { address, isConnected } = useAccount();

  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [guestList, setGuestList] = useState<Guest[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Effect 1: Check if the current user is a confirmed guest
  useEffect(() => {
    if (!isConnected || !address) {
      setAuthStatus("unauthorized");
      return;
    }

    async function checkAuthorization() {
      try {
        const res = await fetch(`/api/user/bookings?wallet=${address}`);
        if (!res.ok) {
          throw new Error("Failed to fetch your booking status.");
        }

        const myBookings: UserBooking[] = await res.json();

        // Find the specific booking for *this* stay
        const myBooking = myBookings.find(
          (b) => b.stay.stayId === stayId && b.status === "CONFIRMED"
        );

        if (myBooking) {
          setAuthStatus("authorized");
        } else {
          setAuthStatus("unauthorized");
        }
      } catch (err: any) {
        setError(err.message);
        setAuthStatus("error");
      }
    }

    checkAuthorization();
  }, [isConnected, address, stayId]);

  // Effect 2: Fetch the guest list *only if* authorized
  useEffect(() => {
    if (authStatus === "authorized" && stayId) {
      async function fetchGuestList() {
        try {
          const res = await fetch(`/api/stay/${stayId}/guest-list`);
          if (!res.ok) {
            throw new Error("Failed to fetch the guest list.");
          }
          const data: Guest[] = await res.json();
          setGuestList(data);
        } catch (err: any) {
          setError(err.message);
          setAuthStatus("error");
        }
      }

      fetchGuestList();
    }
  }, [authStatus, stayId]);

  // --- Render States ---

  if (authStatus === "loading") {
    return (
      <div style={styles.container}>
        <div style={styles.messageCard}>
          <h3>Verifying your access...</h3>
          <p>Checking if you are a confirmed guest for {stayId}.</p>
        </div>
      </div>
    );
  }

  if (authStatus === "unauthorized") {
    return (
      <div style={styles.container}>
        <div style={styles.messageCard}>
          <h2>🚫 Access Denied</h2>
          <p>
            You must be a <strong>confirmed guest</strong> for this stay to
            view the guest list.
          </p>
          {!isConnected ? (
            <div style={{ marginTop: "20px" }}>
              <p>Please connect your wallet to verify.</p>
              <ConnectKitButton />
            </div>
          ) : (
            <Link href="/dashboard" style={styles.dashboardButton}>
              Check My Dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (authStatus === "error") {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h2>Oops! Something went wrong.</h2>
          <p>{error || "An unknown error occurred."}</p>
        </div>
      </div>
    );
  }

  // Authorized State
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Guest List</h1>
      <p style={styles.subtitle}>
        Meet the other confirmed builders attending{" "}
        <strong>{stayId}</strong>
      </p>
      <img src="" alt="Image of a group of diverse professionals networking and collaborating, representing the 'builders' attending the stay." />

      {guestList.length === 0 ? (
        <div style={styles.messageCard}>
          <h3>Guest List is Empty</h3>
          <p>
            No guests have opted-in to the public list yet. Check back soon!
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {guestList.map((guest, index) => (
            <div key={index} style={styles.guestCard}>
              <div style={styles.avatar}>
                <User size={24} color="#3b82f6" />
              </div>
              <h3 style={styles.guestName}>{guest.displayName}</h3>
              <p style={styles.guestRole}>{guest.role}</p>
              <div style={styles.socials}>
                {guest.socialTwitter && (
                  <a
                    href={guest.socialTwitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.socialLink}
                  >
                    <Twitter size={18} />
                  </a>
                )}
                {guest.socialLinkedin && (
                  <a
                    href={guest.socialLinkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.socialLink}
                  >
                    <Linkedin size={18} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Basic Styling ---
const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    maxWidth: "1000px",
    margin: "40px auto",
    padding: "0 20px",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#111827",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#6b7280",
    marginBottom: "40px",
  },
  messageCard: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    textAlign: "center",
  } as const,
  errorCard: {
    backgroundColor: "#fee2e2",
    padding: "40px",
    borderRadius: "12px",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    textAlign: "center",
  } as const,
  dashboardButton: {
    display: "inline-block",
    marginTop: "20px",
    padding: "12px 24px",
    backgroundColor: "#0070f3",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontWeight: "600",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
  },
  guestCard: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    textAlign: "center",
    transition: "transform 0.2s, box-shadow 0.2s",
  } as const,
  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px auto",
  },
  guestName: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "4px",
  },
  guestRole: {
    fontSize: "0.9rem",
    color: "#6b7280",
    marginBottom: "16px",
  },
  socials: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
  },
  socialLink: {
    color: "#9ca3af",
    textDecoration: "none",
    transition: "color 0.2s",
  },
} as const;