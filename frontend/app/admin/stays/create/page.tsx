"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

// Form schema - all strings from inputs
const staySchema = z.object({
  title: z.string().min(3, 'Title is required'),
  slug: z.string().min(3, 'Slug is required (e.g., "ibw")'),
  location: z.string().min(3, 'Location is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  priceUSDC: z.string().min(1, 'Price is required'),
  priceUSDT: z.string().min(1, 'Price is required'),
  slotsTotal: z.string().min(1, 'Slots is required'),
});

type StayFormInputs = z.infer<typeof staySchema>;

export default function CreateStayPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StayFormInputs>({
    resolver: zodResolver(staySchema),
  });

  const onSubmit: SubmitHandler<StayFormInputs> = async (data) => {
    setApiError(null);
    
    // Validate and transform numeric values
    const priceUSDC = parseFloat(data.priceUSDC);
    const priceUSDT = parseFloat(data.priceUSDT);
    const slotsTotal = parseInt(data.slotsTotal, 10);

    if (isNaN(priceUSDC) || priceUSDC <= 0) {
      setApiError('USDC price must be a positive number');
      return;
    }
    if (isNaN(priceUSDT) || priceUSDT <= 0) {
      setApiError('USDT price must be a positive number');
      return;
    }
    if (isNaN(slotsTotal) || slotsTotal <= 0) {
      setApiError('Slots must be a positive number');
      return;
    }

    try {
      const payload = {
        title: data.title,
        slug: data.slug,
        location: data.location,
        startDate: data.startDate,
        endDate: data.endDate,
        priceUSDC,
        priceUSDT,
        slotsTotal,
      };

      const res = await fetch('/api/admin/stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to create stay');
      }
      
      alert('Stay created successfully!');
      router.push('/admin/stays');
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create New Stay</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Stay Title</label>
          <input 
            {...register('title')} 
            placeholder="IBW 2026 Den"
            style={styles.input}
          />
          {errors.title && <span style={styles.error}>{errors.title.message}</span>}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Slug (URL-friendly)</label>
          <input 
            {...register('slug')} 
            placeholder="ibw-2026"
            style={styles.input}
          />
          {errors.slug && <span style={styles.error}>{errors.slug.message}</span>}
          <small style={styles.hint}>Used in URLs like: /stay/ibw-2026</small>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Location</label>
          <input 
            {...register('location')} 
            placeholder="Goa, India"
            style={styles.input}
          />
          {errors.location && <span style={styles.error}>{errors.location.message}</span>}
        </div>

        <div style={styles.fieldGroup}>
          <div style={styles.field}>
            <label style={styles.label}>Start Date</label>
            <input 
              type="date" 
              {...register('startDate')}
              style={styles.input}
            />
            {errors.startDate && <span style={styles.error}>{errors.startDate.message}</span>}
          </div>
          <div style={styles.field}>
            <label style={styles.label}>End Date</label>
            <input 
              type="date" 
              {...register('endDate')}
              style={styles.input}
            />
            {errors.endDate && <span style={styles.error}>{errors.endDate.message}</span>}
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <div style={styles.field}>
            <label style={styles.label}>Price (USDC)</label>
            <input 
              type="number" 
              step="0.01"
              {...register('priceUSDC')} 
              placeholder="300"
              style={styles.input}
            />
            {errors.priceUSDC && <span style={styles.error}>{errors.priceUSDC.message}</span>}
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Price (USDT)</label>
            <input 
              type="number" 
              step="0.01"
              {...register('priceUSDT')} 
              placeholder="300"
              style={styles.input}
            />
            {errors.priceUSDT && <span style={styles.error}>{errors.priceUSDT.message}</span>}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Total Slots</label>
          <input 
            type="number" 
            {...register('slotsTotal')} 
            placeholder="50"
            style={styles.input}
          />
          {errors.slotsTotal && <span style={styles.error}>{errors.slotsTotal.message}</span>}
        </div>

        {apiError && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {apiError}
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button 
            type="button" 
            onClick={() => router.push('/admin/stays')}
            style={styles.cancelButton}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            style={{
              ...styles.button,
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Stay'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '30px',
    color: '#111',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  fieldGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  label: {
    fontWeight: '600' as const,
    fontSize: '0.95rem',
    color: '#374151',
  },
  input: {
    padding: '10px 14px',
    fontSize: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  hint: {
    fontSize: '0.85rem',
    color: '#6b7280',
    marginTop: '4px',
  },
  error: { 
    color: '#dc2626', 
    fontSize: '0.875rem',
    marginTop: '4px',
  },
  errorBox: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    color: '#dc2626',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  button: {
    flex: 1,
    padding: '14px',
    fontSize: '1rem',
    fontWeight: '600' as const,
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    fontSize: '1rem',
    fontWeight: '600' as const,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
} as const;