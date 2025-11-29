import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {

  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <img src="/logo-2.png" alt="wms logo" className="w-12" />
            <span>CloudWMS</span>
          </div>
          <nav>
            {
              !isLoaded
                ? <Loader2 className="h-8 w-8 animate-spin text-primary" />
                : (
                  isSignedIn
                    ? (
                      <Link to="/admin">
                        <Button
                          className='cursor-pointer'
                          variant="default"
                        >
                          Enter Dashboard
                        </Button>
                      </Link>
                    )
                    : (
                      <SignInButton mode="modal">
                        <Button className='cursor-pointer' variant="default">Sign In</Button>
                      </SignInButton>
                    )
                )
            }
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center py-20 px-4 text-center bg-linear-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Warehouse Management <br />
            <span className="text-primary">Reimagined</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience the next generation of inventory control.
            Powered by AI to help you find, track, and manage your stock with unprecedented ease.
          </p>
        </div>
      </section>
    </div>
  )
}
