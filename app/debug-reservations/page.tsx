'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function DebugReservationsPublic() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReservations = async () => {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { data, error } = await supabase
                .from('reservations')
                .select(`
                    id, 
                    created_at, 
                    menu_type, 
                    created_via, 
                    status,
                    guests(first_name, last_name, phone),
                    halls(name)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) console.error(error);
            else setReservations(data || []);
            setLoading(false);
        };

        fetchReservations();
    }, []);

    if (loading) return <div className="p-8 bg-black min-h-screen text-white">Loading debug data...</div>;

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
                            <th className="px-4 py-3">Guest</th>
                            <th className="px-4 py-3 text-amber-400 font-bold border-l border-white/10">MENU TYPE</th>
                            <th className="px-4 py-3 border-r border-white/10">Source</th>
                            <th className="px-4 py-3">Hall</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.map((r) => (
                            <tr key={r.id} className="border-b border-white/10 hover:bg-white/5">
                                <td className="px-4 py-3">{new Date(r.created_at).toLocaleString('ru-RU')}</td>
                                <td className="px-4 py-3">
                                    {r.guests?.first_name} {r.guests?.last_name} <br />
                                    <span className="text-xs text-gray-500">{r.guests?.phone}</span>
                                </td>
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
                                <td className="px-4 py-3">{r.halls?.name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
