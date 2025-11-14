"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [text, setText] = useState("");
  const addItem = useMutation(api.user.index.addItem);
  const items = useQuery(api.user.index.getItems);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      await addItem({ text: text.trim() });
      setText("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col gap-8 py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Add Items
          </h1>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text..."
              className="flex-1"
            />
            <Button type="submit">Add</Button>
          </form>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Items
          </h2>
          {items === undefined ? (
            <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">No items yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800 p-4 text-black dark:text-zinc-50"
                >
                  {item.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
