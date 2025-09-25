import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Calendar, Plus, Settings } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-foreground">
            College Event Management
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            
            <Link to="/add-event">
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </Link>
            
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            
            <div className="text-sm text-muted-foreground">
              Welcome, {profile?.name}
            </div>
            
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;