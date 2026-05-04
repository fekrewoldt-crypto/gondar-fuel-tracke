import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { reportsService } from '../../services/reports.service';
import { stationsService } from '../../services/stations.service';
import { useGeolocation } from '../../hooks/useGeolocation';
import { GONDAR_BOUNDS, isWithinGondar } from '../../utils/gondar-bounds';
import type { FuelStation } from '../../types/station.types';
import type { CreateReportData } from '../../types/report.types';

// Form validation schema
const reportSchema = z.object({
  station_id: z.string().uuid('Please select a fuel station'),
  fuel_type: z.enum(['diesel', 'gasoline_95', 'gasoline_92', 'kerosene']),
  price: z.number().min(1, 'Price must be at least 1 Birr').max(200, 'Price seems too high'),
  availability: z.enum(['full', 'limited', 'very_limited', 'out_of_stock']),
  quantity_available_liters: z.number().min(0).max(100000).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

// Availability options with icons and colors
const AVAILABILITY_OPTIONS = [
  { value: 'full', label: 'Full Stock', color: 'bg-green-500', icon: '✓' },
  { value: 'limited', label: 'Limited', color: 'bg-orange-500', icon: '!' },
  { value: 'very_limited', label: 'Very Limited', color: 'bg-red-400', icon: '!!' },
  { value: 'out_of_stock', label: 'Out of Stock', color: 'bg-red-600', icon: '✗' },
] as const;

// Fuel type options
const FUEL_TYPE_OPTIONS = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'gasoline_95', label: 'Gasoline 95' },
  { value: 'gasoline_92', label: 'Gasoline 92' },
  { value: 'kerosene', label: 'Kerosene' },
] as const;

interface ReportFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  preselectedStation?: FuelStation;
}

const ReportForm: React.FC<ReportFormProps> = ({
  onSuccess,
  onCancel,
  preselectedStation,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStationSearch, setShowStationSearch] = useState(false);

  const { location, error: geoError } = useGeolocation();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    mode: 'onChange',
    defaultValues: {
      fuel_type: 'diesel',
      availability: 'full',
    },
  });

  const selectedStationId = watch('station_id');

  // Load stations for search
  const loadStations = useCallback(async (query: string) => {
    if (query.length < 2) return;

    try {
      const data = await stationsService.getStations({
        bounds: {
          north: GONDAR_BOUNDS.north,
          south: GONDAR_BOUNDS.south,
          east: GONDAR_BOUNDS.east,
          west: GONDAR_BOUNDS.west,
        },
      });

      // Filter by search query
      const filtered = data.stations.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.brand?.toLowerCase().includes(query.toLowerCase())
      );

      setStations(filtered.slice(0, 10));
    } catch (error) {
      console.error('Failed to load stations:', error);
    }
  }, []);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        loadStations(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, loadStations]);

  // Set preselected station
  React.useEffect(() => {
    if (preselectedStation) {
      setValue('station_id', preselectedStation.id);
      setShowStationSearch(false);
    }
  }, [preselectedStation, setValue]);

  const onSubmit = async (data: ReportFormData) => {
    if (!location) {
      setSubmitError('Location access is required to submit a report');
      return;
    }

    // Validate location is within Gondar
    if (!isWithinGondar(location.latitude, location.longitude)) {
      setSubmitError('You must be within Gondar city to submit a report');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const reportData: CreateReportData = {
        station_id: data.station_id,
        fuel_type: data.fuel_type,
        price: data.price,
        availability: data.availability,
        quantity_available_liters: data.quantity_available_liters,
        notes: data.notes,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      };

      await reportsService.createReport(reportData);

      // Reset form
      setValue('price', undefined as any);
      setValue('quantity_available_liters', undefined as any);
      setValue('notes', '');

      onSuccess?.();
    } catch (error: any) {
      setSubmitError(
        error.response?.data?.error?.message ||
        'Failed to submit report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStation = stations.find((s) => s.id === selectedStationId) || preselectedStation;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Report Fuel Status</h2>

      {/* Station Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fuel Station *
        </label>

        {preselectedStation ? (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="font-medium">{preselectedStation.name}</p>
            <p className="text-sm text-gray-500">{preselectedStation.brand}</p>
            <button
              type="button"
              onClick={() => setShowStationSearch(true)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Change station
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a station..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowStationSearch(true);
              }}
              onFocus={() => setShowStationSearch(true)}
            />

            {showStationSearch && stations.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {stations.map((station) => (
                  <button
                    key={station.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    onClick={() => {
                      setValue('station_id', station.id);
                      setSearchQuery(station.name);
                      setShowStationSearch(false);
                    }}
                  >
                    <p className="font-medium">{station.name}</p>
                    <p className="text-sm text-gray-500">{station.address}</p>
                  </button>
                ))}
              </div>
            )}

            {errors.station_id && (
              <p className="mt-1 text-sm text-red-600">{errors.station_id.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Fuel Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fuel Type *
        </label>
        <Controller
          name="fuel_type"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {FUEL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price per Liter (Birr) *
        </label>
        <input
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true })}
          placeholder="e.g., 65.50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
        )}
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Availability Status *
        </label>
        <Controller
          name="availability"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => field.onChange(option.value)}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all
                    ${field.value === option.value
                      ? `border-${option.color.split('-')[1]}-500 bg-${option.color.split('-')[1]}-50`
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${option.color}`} />
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        />
        {errors.availability && (
          <p className="mt-1 text-sm text-red-600">{errors.availability.message}</p>
        )}
      </div>

      {/* Quantity (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estimated Quantity Available (Liters)
        </label>
        <input
          type="number"
          {...register('quantity_available_liters', { valueAsNumber: true })}
          placeholder="Optional estimate"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Any additional information (wait time, queue length, etc.)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
        )}
      </div>

      {/* Location info */}
      {location && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            ✓ Location verified: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </p>
        </div>
      )}

      {geoError && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠ Location access denied. Please enable location services to submit reports.
          </p>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !isValid || !location}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
};

export default ReportForm;
