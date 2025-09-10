"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/navbar";

export default function AlbumDetail() {
  const { id } = useParams();
  const router = useRouter();

  const albums = [
    {
      id: "1",
      eventName: "Wedding Ceremony",
      title: "John & Jane’s Wedding",
      description: "A beautiful wedding ceremony held in Bali.",
    },
    {
      id: "2",
      eventName: "Birthday Party",
      title: "Alice’s 21st Birthday",
      description: "A night full of fun, laughter, and memories.",
    },
    {
      id: "3",
      eventName: "Graduation",
      title: "High School Graduation",
      description: "Celebrating the milestone of finishing high school.",
    },
  ];

  const album = albums.find((a) => a.id === id);

  const [form, setForm] = useState({
    eventName: album?.eventName || "",
    title: album?.title || "",
    description: album?.description || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Updated album:", form);
    alert("Album updated");
  };

  if (!album) {
    return <p className="p-6 text-red-500">Album not found</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
      <main className="flex-1 px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto space-y-6"
        >
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Event Name
            </label>
            <input
              type="text"
              name="eventName"
              value={form.eventName}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 text-lg"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3 text-lg"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              className="w-full border rounded-lg px-4 py-3 text-lg"
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 rounded-lg border text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
