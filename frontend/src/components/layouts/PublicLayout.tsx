import { Outlet, Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useState } from "react";
import footerImg from "../../assets/img/wedge-footer.png";

export default function PublicLayout() {
  const { user, signOut } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#a5d7f3' }}>
      {/* Header */}
      <header className="border-b-2 border-black" style={{ backgroundColor: '#a5d7f3' }}>
        <nav className="max-w-[2000px] mx-auto">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="block py-2 px-5 no-underline">
                <p className="text-2xl md:text-3xl mb-0 text-black" style={{ fontFamily: 'Carena, Pacifico, cursive' }}>
                  Uptown Porchfest
                </p>
                <p className="text-sm mt-0 text-black font-medium">
                  Aug 16, 2025
                </p>
              </Link>
              
              {/* Instagram icon (mobile) */}
              <a 
                href="https://www.instagram.com/uptownporchfest/" 
                target="_blank" 
                rel="noreferrer"
                className="md:hidden ml-2 text-black"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
              </a>
            </div>

            {/* Mobile menu toggle */}
            <button 
              className="md:hidden p-4 text-black"
              onClick={toggleMenu}
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileMenuOpen ? '✕' : '☰'}
              </span>
            </button>

            {/* Desktop Navigation */}
            <ul className="hidden md:flex items-center list-none m-0 p-0 gap-6 pr-6">
              <li>
                <Link onClick={closeMenu} to="/bands" className="text-black no-underline hover:font-bold transition-all">
                  Bands Playing
                </Link>
              </li>
              <li>
                <Link onClick={closeMenu} to="/schedule" className="text-black no-underline hover:font-bold transition-all">
                  Schedule
                </Link>
              </li>
              <li>
                <Link onClick={closeMenu} to="/map" className="text-black no-underline hover:font-bold transition-all">
                  Map
                </Link>
              </li>
              <li>
                <Link onClick={closeMenu} to="/for-bands" className="text-black no-underline hover:font-bold transition-all">
                  Band Signup
                </Link>
              </li>
              <li>
                <Link onClick={closeMenu} to="/for-hosts" className="text-black no-underline hover:font-bold transition-all">
                  Porch Signup
                </Link>
              </li>
              <li>
                <Link onClick={closeMenu} to="/faq" className="text-black no-underline hover:font-bold transition-all">
                  FAQ
                </Link>
              </li>
              {user?.role === "admin" && (
                <li>
                  <Link onClick={closeMenu} to="/admin" className="text-black no-underline hover:font-bold transition-all">
                    Admin
                  </Link>
                </li>
              )}
              <li>
                <a 
                  href="https://www.instagram.com/uptownporchfest/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-black"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                  </svg>
                </a>
              </li>
              {user ? (
                <li>
                  <button onClick={signOut} className="text-black no-underline hover:font-bold transition-all bg-transparent border-none cursor-pointer">
                    Sign Out
                  </button>
                </li>
              ) : (
                <li>
                  <Link to="/login" className="text-black no-underline hover:font-bold transition-all">
                    Admin Login
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <ul className="md:hidden list-none m-0 p-0">
              <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                <Link onClick={closeMenu} to="/bands" className="text-black no-underline block">
                  Bands Playing
                </Link>
              </li>
              <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                <Link onClick={closeMenu} to="/schedule" className="text-black no-underline block">
                  Schedule
                </Link>
              </li>
              <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                <Link onClick={closeMenu} to="/map" className="text-black no-underline block">
                  Map
                </Link>
              </li>
              <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                <Link onClick={closeMenu} to="/for-bands" className="text-black no-underline block">
                  Band Signup
                </Link>
              </li>
              <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                <Link onClick={closeMenu} to="/for-hosts" className="text-black no-underline block">
                  Porch Signup
                </Link>
              </li>
              <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                <Link onClick={closeMenu} to="/faq" className="text-black no-underline block">
                  FAQ
                </Link>
              </li>
              {user?.role === "admin" && (
                <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                  <Link onClick={closeMenu} to="/admin" className="text-black no-underline block">
                    Admin
                  </Link>
                </li>
              )}
              {user ? (
                <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                  <button onClick={() => { signOut(); closeMenu(); }} className="text-black no-underline bg-transparent border-none cursor-pointer">
                    Sign Out
                  </button>
                </li>
              ) : (
                <li className="border-b border-[#dfff9c] text-center py-2 hover:bg-[blanchedalmond]">
                  <Link onClick={closeMenu} to="/login" className="text-black no-underline block">
                    Admin Login
                  </Link>
                </li>
              )}
            </ul>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-[2000px] mx-auto">
        <Outlet />
      </main>

      {/* Footer - with cityscape image background */}
      <footer 
        className="relative h-[300px] md:h-[750px] bg-cover bg-bottom flex flex-col-reverse"
        style={{ 
          background: `linear-gradient(180deg, #a5d7f3 12%, rgba(255,255,255,0) 47%), 
                       url(${footerImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }}
      >
        <div 
          className="flex flex-wrap justify-around items-end gap-5 px-4 py-3 text-xs"
          style={{ backgroundColor: 'rgba(14,6,9,0.54)', color: 'blanchedalmond' }}
        >
          <div>
            Contact:{" "}
            <a href="mailto:uptownporchfest@gmail.com" className="text-[blanchedalmond]">
              uptownporchfest @ gmail.com
            </a>
          </div>
          <div className="text-center">
            <p className="mb-0">
              Website design, development, and hosting donated by{" "}
              <a href="mailto:martelly.lisa@gmail.com" className="text-[blanchedalmond]">
                Martelly Media
              </a>
            </p>
            <p className="mb-0 mt-1">
              Footer image by{" "}
              <a href="http://chrisdummer.com/" className="text-[blanchedalmond]">
                Chris Dummer
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
