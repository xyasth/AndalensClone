"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/navbar";

export default function NewAlbum() {
  const router = useRouter();

  const [form, setForm] = useState({
    eventName: "",
    title: "", 
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("New album created:", form);
    alert("Album created");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

        {/*navbar*/}
        <Navbar />

      <main className="flex-1 px-6 py-8">

        {/*Form*/}
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto space-y-6"
        >

            {/*Event Name Input field*/}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Event Name
            </label>
            <input
              type="text"
              name="eventName"
              value={form.eventName}
              onChange={handleChange}
              placeholder="Enter event name"
              className="w-full border rounded-lg px-4 py-3 text-lg"
            />
          </div>

            {/*Title Input Field*/}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter album title"
              className="w-full border rounded-lg px-4 py-3 text-lg"
            />
          </div>

            {/*Description Input field*/}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              placeholder="Enter album description"
              className="w-full border rounded-lg px-4 py-3 text-lg"
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">

            {/*Cancel Button*/}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 rounded-lg border text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            
            {/*Create album button*/}
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Create Album
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
