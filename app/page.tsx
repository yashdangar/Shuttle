import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="text-xl font-bold">Shuttle Service</div>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Welcome to Shuttle Service
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Book your shuttle rides with ease. Fast, reliable, and convenient
              transportation for your travel needs.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Easy Booking</CardTitle>
                <CardDescription>
                  Book your shuttle ride in just a few clicks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Simple and intuitive booking process for all your travel needs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-time Tracking</CardTitle>
                <CardDescription>
                  Track your shuttle in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Know exactly when your shuttle will arrive with live updates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multiple Locations</CardTitle>
                <CardDescription>
                  Service available at multiple locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Choose from various pickup and drop-off locations.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Link href="/sign-up">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
