'use client';

import React, { useEffect, useState } from 'react';

export interface MatchRecord {
  id: string;
  winnerName: string;
  winnerRating?: number | string;
  loserName: string;
  loserRating?: number | string;
  createdAt?: string;
}

export default function AdminPage() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/matches');
        if (!response.ok) {
          throw new Error('Failed to fetch admin match data');
        }
        const data: MatchRecord[] = await response.json();
        setRecords(data);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-600">Loading match records...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>

      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Winner
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Winner Rating
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Loser
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Loser Rating
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              records.map((match) => {
                const {
                  id,
                  winnerName,
                  winnerRating,
                  loserName,
                  loserRating,
                  createdAt,
                } = match;

                return (
                  <tr key={id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {winnerName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {winnerRating !== undefined && winnerRating !== null ? winnerRating : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {loserName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {loserRating !== undefined && loserRating !== null ? loserRating : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {createdAt ? new Date(createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}