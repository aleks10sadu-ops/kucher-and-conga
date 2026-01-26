'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function DebugReservationsPublic() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchReservations = async () => {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                setErrorMsg("Supabase client not initialized");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.rpc('debug_get_reservations_simple');

            if (error) {
                console.error(error);
                setErrorMsg(error.message || JSON.stringify(error));
            } else {
                setReservations(data || []);
            }
            setLoading(false);
        };

        fetchReservations();
    }, []);

    if (loading) return <div className="p-8 bg-black min-h-screen text-white">Loading debug data...</div>;

    if (errorMsg) return (
        <div className="p-8 bg-black min-h-screen text-red-500">
            <h1 className="text-2xl font-bold mb-4">Error Loading Data</h1>
            <pre className="bg-red-900/20 p-4 rounded border border-red-500">{errorMsg}</pre>
            <p className="mt-4 text-white">Please check console for more details.</p>
        </div>
    );

    if (reservations.length === 0) return (
        <div className="p-8 bg-black min-h-screen text-white">
            <h1 className="text-2xl font-bold mb-4 text-amber-400">Public Reservation Debugger</h1>
            <p className="text-neutral-400">No reservations found (or permission denied).</p>
            <p className="text-sm mt-2">Did you run the <code className="text-amber-400">supa_comprehensive_fix.sql</code> script?</p>
        </div>
    );

    return (
        <div className="p-8 bg-black min-h-screen text-white font-sans">
            <h1 className="text-2xl font-bold mb-4 text-amber-400">Public Reservation Debugger</h1>
            <p className="mb-4 text-gray-400">
                Data from Supabase 'reservations' table.<br />
                If MENU TYPE is <span className="text-green-400 font-bold">main_menu</span>, the database is correct.<br />
                If MENU TYPE is <span className="text-red-500 font-bold">banquet</span>, the trigger is missing.
            </p>

            <div className="overflow-x-auto border border-white/20 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white/10 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3 text-amber-400 font-bold border-l border-white/10">MENU TYPE</th>
                            <th className="px-4 py-3 border-r border-white/10">Source</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.map((r) => (
                            <tr key={r.id} className="border-b border-white/10 hover:bg-white/5">
                                <td className="px-4 py-3">{new Date(r.created_at).toLocaleString('ru-RU')}</td>
                                <td className="px-4 py-3 font-mono text-lg font-bold border-l border-r border-white/10">
                                    {r.menu_type === 'main_menu' ? (
                                        <span className="text-green-400">{r.menu_type}</span>
                                    ) : (
                                        <span className="text-red-500">{r.menu_type}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                    {r.created_via === 'website' ? (
                                        <span className="text-blue-400">{r.created_via}</span>
                                    ) : (
                                        <span>{r.created_via}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">{r.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
