"use client";

import Link from "next/link";
import Navbar from "@/components/navbar";

export default function Dashboard() {
    const albums = [
        {
            id: 1,
            eventName: "Wedding Ceremony",
            title: "John & Jane’s Wedding",
        },
        {
            id: 2,
            eventName: "Birthday Party",
            title: "Alice’s 21st Birthday",
        },
        {
            id: 3,
            eventName: "Graduation",
            title: "High School Graduation",
        },
    ];

    return (
        <div className="px-6 py-8">
            <Navbar />
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Albums</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/album/add">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 hover:bg-gray-50 cursor-pointer">
                        <span className="text-4xl">+</span>
                        <p className="mt-2 text-gray-600 font-medium">Add New Album</p>
                    </div>
                </Link>

                {albums.map((album) => (
                    <div key={album.id} className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                {album.eventName}
                            </h2>
                            <p className="text-gray-600">{album.title}</p>
                        </div>
                        <div className="mt-4">
                            <Link href={`/album/${album.id}`}>
                                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                                    View Details
                                </button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
