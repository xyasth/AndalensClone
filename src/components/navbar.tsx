"use client";

import Image from "next/image";

export default function Navbar() {
    {/*Dummy data*/ }
    const user = {
        name: "joren",
        email: "joren@mail.com",
        image: "/favicon.ico",
    };

    return (
        <nav className="w-full flex items-center justify-between px-6 py-4 bg-white shadow-md">
            <div className="flex items-center gap-3">
                {/*show user image*/}
                <Image
                    src={user.image}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full"
                />
                {/*Show user name and email*/}
                <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{user.name}</span>
                    <span className="text-sm text-gray-500">{user.email}</span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/*Navigation Links*/}
                <a href="/dashboard" className="text-gray-700 hover:text-blue-600">
                    Beranda
                </a>
                <a href="#" className="text-gray-700 hover:text-blue-600">
                    Tentang Kami
                </a>
                <button className="text-red-600 hover:underline">
                    Keluar
                </button>
            </div>
        </nav>
    );
}
