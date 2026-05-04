import api from './api';
import type { CreateReportData, Report, ReportQueryParams } from '../types/report.types';

interface GetReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary?: {
    total_count: number;
    avg_price: number;
    availability_distribution: Record<string, number>;
  };
}

interface UserReportStats {
  total_reports: number;
  verified_reports: number;
  this_month: number;
}

export const reportsService = {
  /**
   * Create a new fuel report
   */
  async createReport(data: CreateReportData): Promise<Report> {
    const response = await api.post('/reports', data);
    return response.data;
  },

  /**
   * Get reports with filtering
   */
  async getReports(params?: ReportQueryParams): Promise<GetReportsResponse> {
    const queryParams = new URLSearchParams();

    if (params?.station_id) {
      queryParams.set('station_id', params.station_id);
    }

    if (params?.fuel_type) {
      queryParams.set('fuel_type', params.fuel_type);
    }

    if (params?.availability) {
      queryParams.set('availability', params.availability);
    }

    if (params?.verified !== undefined) {
      queryParams.set('verified', params.verified.toString());
    }

    if (params?.date_from) {
      queryParams.set('date_from', params.date_from);
    }

    if (params?.date_to) {
      queryParams.set('date_to', params.date_to);
    }

    if (params?.bounds) {
      queryParams.set('bounds', `${params.bounds.north},${params.bounds.south},${params.bounds.east},${params.bounds.west}`);
    }

    if (params?.page) {
      queryParams.set('page', params.page.toString());
    }

    if (params?.limit) {
      queryParams.set('limit', params.limit.toString());
    }

    const response = await api.get(`/reports?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get current user's reports
   */
  async getMyReports(params?: {
    page?: number;
    limit?: number;
    include_station?: boolean;
  }): Promise<{ reports: Report[]; pagination: any; stats: UserReportStats }> {
    const queryParams = new URLSearchParams();

    if (params?.page) {
      queryParams.set('page', params.page.toString());
    }

    if (params?.limit) {
      queryParams.set('limit', params.limit.toString());
    }

    if (params?.include_station) {
      queryParams.set('include_station', 'true');
    }

    const response = await api.get(`/reports/my-reports?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Verify a report
   */
  async verifyReport(reportId: string): Promise<{
    report_id: string;
    verified: boolean;
    verification_count: number;
    user_has_verified: boolean;
  }> {
    const response = await api.post(`/reports/${reportId}/verify`);
    return response.data;
  },

  /**
   * Flag a report as inaccurate
   */
  async flagReport(
    reportId: string,
    reason: string,
    notes?: string
  ): Promise<{
    report_id: string;
    flagged: boolean;
    flag_count: number;
  }> {
    const response = await api.post(`/reports/${reportId}/flag`, {
      reason,
      notes,
    });
    return response.data;
  },

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<void> {
    await api.delete(`/reports/${reportId}`);
  },

  /**
   * Get recent reports for dashboard
   */
  async getRecentReports(limit: number = 10): Promise<Report[]> {
    const response = await api.get('/reports/recent', {
      params: { limit },
    });
    return response.data.reports;
  },
};

export default reportsService;
