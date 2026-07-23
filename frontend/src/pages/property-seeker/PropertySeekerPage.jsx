import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Bath,
  BedDouble,
  Building2,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Eye,
  Heart,
  Home,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { propertySeekerAPI } from '../../services/api';
import { formatUGX } from '../../utils/currency';
import BrandLogo from '../../components/BrandLogo';

const GOOGLE_MAPS_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_PUBLIC_KEY || '').trim();
const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const safeText = (value, fallback = 'N/A') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const priceRanges = [
  ['', 'Price Range'],
  ['0-500000', 'Up to UGX 500k'],
  ['500000-1000000', 'UGX 500k - 1M'],
  ['1000000-2000000', 'UGX 1M - 2M'],
  ['2000000-0', 'Above UGX 2M']
];

const propertyTypes = [
  ['', 'Property Type'],
  ['apartment', 'Apartment'],
  ['house', 'House'],
  ['commercial', 'Commercial'],
  ['land', 'Land'],
  ['other', 'Other']
];

const bedrooms = [
  ['', 'Bedrooms'],
  ['1', '1+ Bedrooms'],
  ['2', '2+ Bedrooms'],
  ['3', '3+ Bedrooms'],
  ['4', '4+ Bedrooms']
];

const loadGoogleMaps = (() => {
  let promise;
  return (key) => {
    if (!key) return Promise.reject(new Error('Google Maps key missing'));
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (promise) return promise;
    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
      script.async = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error('Unable to load Google Maps'));
      document.head.appendChild(script);
    });
    return promise;
  };
})();

const loadGoogleIdentity = (() => {
  let promise;
  return () => {
    if (window.google?.accounts) return Promise.resolve(window.google.accounts);
    if (promise) return promise;
    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google.accounts);
      script.onerror = () => reject(new Error('Unable to load Google sign-in'));
      document.head.appendChild(script);
    });
    return promise;
  };
})();

const profileIsComplete = (seeker) => Boolean(
  safeText(seeker?.phone || seeker?.profile?.phoneNumber, '')
  && safeText(seeker?.profile?.location, '')
);

export default function PropertySeekerPage() {
  const { listingId } = useParams();
  const location = useLocation();
  const isDashboardRoute = location.pathname.includes('/property-seeker/dashboard');
  const { user, isAuthenticated, authenticateWithToken } = useAuth();
  const [listings, setListings] = useState([]);
  const [pricing, setPricing] = useState({ pricePerView: 0, currency: 'UGX', minimumViews: 1, maximumViews: 100, configured: false });
  const [seeker, setSeeker] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [filters, setFilters] = useState({ search: '', propertyType: '', priceRange: '', bedrooms: '', sort: 'latest' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [unlockedListing, setUnlockedListing] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');

  const isPropertySeeker = isAuthenticated && user?.role === 'property_seeker';

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listingResponse, pricingResponse] = await Promise.all([
        propertySeekerAPI.getPublicListings(filters),
        propertySeekerAPI.getPricing()
      ]);
      const nextListings = safeArray(listingResponse.data?.listings);
      setListings(nextListings);
      setPricing(pricingResponse.data?.pricing || { pricePerView: 0, currency: 'UGX', minimumViews: 1, maximumViews: 100, configured: false });
      if (listingId && !selectedListing) {
        const routeListing = nextListings.find((item) => String(item.listingId) === String(listingId));
        if (routeListing) setSelectedListing(routeListing);
      }
    } catch (requestError) {
      setListings([]);
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load vacant listings.');
    } finally {
      setLoading(false);
    }
  }, [filters, listingId, selectedListing]);

  const loadSeeker = useCallback(async () => {
    if (!isPropertySeeker) return null;
    try {
      const response = await propertySeekerAPI.getMe();
      const nextSeeker = response.data?.seeker || null;
      setSeeker(nextSeeker);
      return nextSeeker;
    } catch {
      setSeeker(null);
      return null;
    }
  }, [isPropertySeeker]);

  const loadDashboard = useCallback(async () => {
    if (!isPropertySeeker || !isDashboardRoute) return;
    try {
      const response = await propertySeekerAPI.getDashboard();
      setDashboard(response.data || null);
    } catch {
      setDashboard(null);
    }
  }, [isDashboardRoute, isPropertySeeker]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    loadSeeker();
    loadDashboard();
  }, [loadDashboard, loadSeeker]);

  const remainingViews = safeNumber(seeker?.stats?.walletBalance ?? seeker?.stats?.remainingViews);

  const requestUnlock = async (listing) => {
    setSelectedListing(listing);
    setPaymentMessage('');
    if (!isPropertySeeker) {
      setLoginOpen(true);
      return;
    }

    const currentSeeker = seeker || await loadSeeker();
    if (!profileIsComplete(currentSeeker)) {
      setProfileOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      const response = await propertySeekerAPI.unlockListing(listing.listingId);
      setUnlockedListing(response.data?.listing || null);
      await loadSeeker();
      await loadDashboard();
    } catch (requestError) {
      if (requestError.response?.status === 402) {
        setPaymentOpen(true);
      } else {
        setError(requestError.response?.data?.message || requestError.message || 'Unable to unlock this listing.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoogleAuth = async (payload) => {
    setActionLoading(true);
    setError('');
    try {
      const response = await propertySeekerAPI.googleAuth(payload);
      authenticateWithToken(response.data);
      setLoginOpen(false);
      const nextSeeker = await propertySeekerAPI.getMe().then((res) => res.data?.seeker || null);
      setSeeker(nextSeeker);
      if (!profileIsComplete(nextSeeker)) {
        setProfileOpen(true);
      } else if (selectedListing) {
        const unlockResponse = await propertySeekerAPI.unlockListing(selectedListing.listingId);
        setUnlockedListing(unlockResponse.data?.listing || null);
        await loadSeeker();
        await loadDashboard();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Google sign-in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isDashboardRoute) {
    return (
      <PropertySeekerShell
        seeker={seeker}
        remainingViews={remainingViews}
        onLogin={() => setLoginOpen(true)}
        onRefresh={() => { loadSeeker(); loadDashboard(); }}
      >
        <DashboardView
          dashboard={dashboard}
          isPropertySeeker={isPropertySeeker}
          onLogin={() => setLoginOpen(true)}
          onUnlockAgain={(item) => {
            const listing = listings.find((entry) => String(entry.listingId) === String(item.listingId));
            if (listing) requestUnlock(listing);
          }}
        />
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onAuth={handleGoogleAuth} loading={actionLoading} error={error} />
      </PropertySeekerShell>
    );
  }

  return (
    <PropertySeekerShell
      seeker={seeker}
      remainingViews={remainingViews}
      onLogin={() => setLoginOpen(true)}
      onRefresh={() => { loadSeeker(); loadDashboard(); }}
    >
      <main className="mx-auto max-w-[1440px] px-4 pb-8 pt-7 sm:px-6 lg:px-8">
        <section className="mb-5">
          <h1 className="text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">Find your next home</h1>
          <p className="mt-2 text-sm text-slate-600">Search verified and available rental properties across Uganda.</p>
          <SearchFilters filters={filters} setFilters={setFilters} onSearch={loadListings} />
        </section>

        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.95fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-900">{loading ? 'Loading properties...' : `${listings.length} available properties`}</p>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                Sort By:
                <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700">
                  <option value="latest">Latest</option>
                  <option value="rent_low">Rent low to high</option>
                  <option value="rent_high">Rent high to low</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="grid min-h-80 place-items-center text-slate-500"><Loader2 className="mb-2 h-6 w-6 animate-spin" />Loading vacant units...</div>
            ) : listings.length ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.listingId} listing={listing} onView={() => requestUnlock(listing)} loading={actionLoading && selectedListing?.listingId === listing.listingId} />
                ))}
              </div>
            ) : (
              <EmptyListings />
            )}

            <PaginationFooter total={listings.length} />
          </div>

          <MapPanel listings={listings} unlockedListing={unlockedListing} />
        </section>
      </main>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onAuth={handleGoogleAuth} loading={actionLoading} error={error} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onSaved={async () => {
        setProfileOpen(false);
        const nextSeeker = await loadSeeker();
        if (selectedListing && profileIsComplete(nextSeeker)) await requestUnlock(selectedListing);
      }} />
      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        selectedListing={selectedListing}
        message={paymentMessage}
        setMessage={setPaymentMessage}
        onUnlocked={(listing) => setUnlockedListing(listing)}
        onPaymentCreated={async () => {
          await loadSeeker();
          await loadDashboard();
        }}
      />
      <UnlockedListingModal
        listing={unlockedListing}
        onClose={() => setUnlockedListing(null)}
        remainingViews={remainingViews}
      />
    </PropertySeekerShell>
  );
}

function PropertySeekerShell({ children, seeker, remainingViews, onLogin, onRefresh }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <a href="/property-seekers" className="inline-flex items-center gap-2 text-xl font-bold text-slate-950">
              <BrandLogo showText size="sm" textClassName="text-slate-950" />
            </a>
            <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 lg:flex">
              <a className="border-b-2 border-blue-600 pb-5 text-blue-600" href="/property-seekers">Search Houses</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#pricing">Pricing</a>
              <a href="#about">About Us</a>
              <a href="#contact">Contact</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm sm:inline-flex">
              <MapPin className="h-4 w-4 text-blue-600" />
              Kampala, Uganda
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {seeker ? (
              <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                <WalletCards className="h-4 w-4 text-blue-600" />
                {remainingViews} views
              </button>
            ) : (
              <button type="button" onClick={onLogin} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
                <span className="text-base font-bold text-blue-600">G</span>
                Continue with Google
              </button>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function SearchFilters({ filters, setFilters, onSearch }) {
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_170px_150px_150px_auto]">
      <label className="relative">
        <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
        <input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Search by location, area or property..." className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
      </label>
      <SelectBox value={filters.propertyType} onChange={(value) => update('propertyType', value)} options={propertyTypes} />
      <SelectBox value={filters.priceRange} onChange={(value) => update('priceRange', value)} options={priceRanges} />
      <SelectBox value={filters.bedrooms} onChange={(value) => update('bedrooms', value)} options={bedrooms} />
      <button type="button" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
        More Filters
        <SlidersHorizontal className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSearch} className="h-12 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white shadow-sm hover:bg-blue-700">Search</button>
    </div>
  );
}

function SelectBox({ value, onChange, options }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
      {options.map(([optionValue, label]) => <option key={label} value={optionValue}>{label}</option>)}
    </select>
  );
}

function ListingCard({ listing, onView, loading }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/9] bg-slate-100">
        {listing.coverImage ? <img src={listing.coverImage} alt={listing.title || 'Vacant rental'} className="h-full w-full object-cover" /> : <PropertyPlaceholder />}
        <span className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold uppercase text-white">Vacant</span>
        <button type="button" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-500 shadow-sm" aria-label="Save property"><Heart className="h-4 w-4" /></button>
      </div>
      <div className="p-4">
        <p className="text-lg font-extrabold text-blue-700">{formatUGX(listing.rent)} <span className="text-xs font-semibold text-slate-500">/ month</span></p>
        <h2 className="mt-2 line-clamp-1 text-base font-bold text-slate-950">{safeText(listing.title, 'Vacant property')}</h2>
        <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-500"><MapPin className="h-4 w-4" />{safeText(listing.generalLocation)}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4 text-slate-500" />{safeNumber(listing.bedrooms)} Beds</span>
          <span className="inline-flex items-center gap-1"><Bath className="h-4 w-4 text-slate-500" />{safeNumber(listing.bathrooms)} Baths</span>
          <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4 text-slate-500" />{safeText(listing.unitType, 'Unit')}</span>
        </div>
        <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{safeText(listing.shortDescription, 'No description provided.')}</p>
        <button type="button" onClick={onView} disabled={loading} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-600 px-4 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          View Property
        </button>
      </div>
    </article>
  );
}

function PropertyPlaceholder() {
  return (
    <div className="grid h-full place-items-center bg-blue-50 text-blue-600">
      <Home className="h-12 w-12" />
    </div>
  );
}

function EmptyListings() {
  return (
    <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
      <div>
        <DoorOpen className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">No properties found</h2>
        <p className="mt-1 text-sm text-slate-500">Published vacant units will appear here when landlords enable marketplace listing.</p>
      </div>
    </div>
  );
}

function PaginationFooter({ total }) {
  return (
    <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <p className="text-sm font-medium text-slate-500">Showing {total ? 1 : 0} to {total} of {total} units</p>
      <div className="flex items-center gap-2">
        <button type="button" className="pagination-button" disabled><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" className="pagination-button bg-blue-600 text-white">1</button>
        <button type="button" className="pagination-button" disabled><ChevronRight className="h-4 w-4" /></button>
      </div>
    </footer>
  );
}

function MapPanel({ listings, unlockedListing }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapError, setMapError] = useState('');
  const markers = useMemo(() => {
    if (unlockedListing?.exactCoordinates) {
      return [{ ...unlockedListing.exactCoordinates, label: formatUGX(unlockedListing.rent), exact: true }];
    }
    return safeArray(listings)
      .map((listing) => listing.approximateCoordinates ? ({ ...listing.approximateCoordinates, label: formatUGX(listing.rent), exact: false }) : null)
      .filter(Boolean);
  }, [listings, unlockedListing]);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || !mapEl.current) return;
    let cancelled = false;
    loadGoogleMaps(GOOGLE_MAPS_KEY)
      .then((maps) => {
        if (cancelled || !mapEl.current) return;
        const center = markers[0] || { lat: 0.3476, lng: 32.5825 };
        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapEl.current, {
            center,
            zoom: markers.length ? 12 : 11,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });
        } else {
          mapRef.current.setCenter(center);
        }
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = markers.map((marker) => new maps.Marker({
          position: { lat: marker.lat, lng: marker.lng },
          map: mapRef.current,
          label: { text: marker.exact ? 'Exact' : marker.label.replace('UGX ', ''), color: '#ffffff', fontSize: '11px', fontWeight: '700' },
          title: marker.exact ? 'Exact unlocked location' : 'Approximate area'
        }));
      })
      .catch((err) => setMapError(err.message || 'Map unavailable'));
    return () => { cancelled = true; };
  }, [markers]);

  return (
    <aside className="relative min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24 xl:h-[430px] xl:min-h-0 2xl:h-[390px]">
      {GOOGLE_MAPS_KEY && !mapError ? <div ref={mapEl} className="h-[360px] w-full xl:h-full" /> : <MapPlaceholder />}
      <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Lock className="h-5 w-5" /></span>
          <div>
            <h3 className="text-sm font-bold text-slate-950">{unlockedListing ? 'Exact location unlocked' : 'Exact locations are hidden'}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">{unlockedListing ? 'This map can show the exact marker while access is active.' : 'Login and unlock a property to view the exact location on map.'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MapPlaceholder() {
  return (
    <div className="relative h-[360px] overflow-hidden bg-slate-100 xl:h-full">
      <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <MapPin className="mx-auto h-10 w-10 text-blue-600" />
          <p className="mt-2 text-sm font-bold text-slate-900">Map preview</p>
          <p className="text-xs text-slate-500">Add a Google Maps key to render live maps.</p>
        </div>
      </div>
    </div>
  );
}

function LoginModal({ open, onClose, onAuth, loading, error }) {
  const codeClientRef = useRef(null);
  const idButtonRef = useRef(null);
  const [localError, setLocalError] = useState('');
  const [googleClientId, setGoogleClientId] = useState(GOOGLE_CLIENT_ID);
  const [configLoading, setConfigLoading] = useState(false);
  const [supportsCodeFlow, setSupportsCodeFlow] = useState(Boolean(GOOGLE_CLIENT_ID));
  const [supportsIdTokenFlow, setSupportsIdTokenFlow] = useState(Boolean(GOOGLE_CLIENT_ID));

  useEffect(() => {
    if (!open) return;
    if (GOOGLE_CLIENT_ID) {
      setGoogleClientId(GOOGLE_CLIENT_ID);
      setSupportsCodeFlow(true);
      setSupportsIdTokenFlow(true);
      return;
    }
    setConfigLoading(true);
    setLocalError('');
    propertySeekerAPI.getGoogleAuthConfig()
      .then((response) => {
        const backendClientId = String(response.data?.clientId || '').trim();
        const codeFlow = Boolean(response.data?.supportsCodeFlow);
        const idTokenFlow = Boolean(response.data?.supportsIdTokenFlow);
        const missingFields = Array.isArray(response.data?.missingFields) ? response.data.missingFields : [];
        setSupportsCodeFlow(codeFlow);
        setSupportsIdTokenFlow(idTokenFlow);
        setGoogleClientId(backendClientId);
        if (!backendClientId) {
          setLocalError(`Google sign-in is not configured. Missing: ${missingFields.length ? missingFields.join(', ') : 'GOOGLE_CLIENT_ID'}.`);
        }
      })
      .catch((requestError) => {
        setLocalError(requestError.response?.data?.message || requestError.message || 'Unable to load Google sign-in configuration.');
      })
      .finally(() => setConfigLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !googleClientId) return;
    let cancelled = false;
    loadGoogleIdentity()
    .then((googleAccounts) => {
      if (cancelled) return;
      if (supportsCodeFlow) {
        codeClientRef.current = googleAccounts.oauth2.initCodeClient({
            client_id: googleClientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          redirect_uri: window.location.origin,
          callback: (response) => {
            if (response?.error) {
              setLocalError(response.error_description || response.error || 'Google sign-in failed.');
              return;
            }
            if (!response?.code) {
              setLocalError('Google sign-in did not return an authorization code.');
              return;
            }
            onAuth({ code: response.code, redirectUri: window.location.origin });
          }
        });
        return;
      }

      if (supportsIdTokenFlow && idButtonRef.current) {
        googleAccounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (!response?.credential) {
              setLocalError('Google sign-in did not return a credential.');
              return;
            }
            onAuth({ credential: response.credential });
          }
        });
        idButtonRef.current.innerHTML = '';
        googleAccounts.id.renderButton(idButtonRef.current, { theme: 'outline', size: 'large', width: 280, text: 'continue_with' });
      }
    })
    .catch((err) => setLocalError(err.message || 'Google sign-in unavailable'));
    return () => { cancelled = true; };
  }, [googleClientId, onAuth, open, supportsCodeFlow, supportsIdTokenFlow]);

  if (!open) return null;
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="text-center">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Lock className="h-8 w-8" /></span>
        <h2 className="mt-5 text-xl font-bold text-slate-950">Sign in to continue</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Use your Google account to unlock property details, exact locations, and landlord contact.</p>
        <div className="mt-6 flex justify-center">
          {googleClientId && supportsCodeFlow ? (
            <button
              type="button"
              onClick={() => {
                setLocalError('');
                if (!codeClientRef.current) {
                  setLocalError('Google sign-in is still loading. Please try again.');
                  return;
                }
                codeClientRef.current.requestCode();
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              <span className="font-bold text-blue-600">G</span>
              {configLoading ? 'Loading Google...' : 'Continue with Google'}
            </button>
          ) : googleClientId && supportsIdTokenFlow ? (
            <div ref={idButtonRef} />
          ) : (
            <button type="button" onClick={() => setLocalError('Google sign-in is not configured. Please set backend GOOGLE_CLIENT_ID (and GOOGLE_CLIENT_SECRET for code flow).')} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-800">
              <span className="font-bold text-blue-600">G</span>
              Continue with Google
            </button>
          )}
        </div>
        {loading ? <p className="mt-3 text-sm font-semibold text-blue-700">Signing in...</p> : null}
        {error || localError ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error || localError}</p> : null}
        <p className="mt-6 text-xs text-slate-500">By continuing, you agree to our <span className="font-semibold text-blue-600">Terms</span> and <span className="font-semibold text-blue-600">Privacy Policy</span>.</p>
      </div>
    </ModalShell>
  );
}

function ProfileModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ phoneNumber: '', location: '', preferredSearchArea: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await propertySeekerAPI.updateProfile(form);
      await onSaved();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
      <h2 className="text-xl font-bold text-slate-950">Complete your profile</h2>
      <p className="mt-2 text-sm text-slate-600">Add a phone number and current location before unlocking private property details.</p>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <Field label="Phone Number" value={form.phoneNumber} onChange={(value) => setForm((current) => ({ ...current, phoneNumber: value }))} placeholder="07XXXXXXXX" required />
        <Field label="Current Location / Address" value={form.location} onChange={(value) => setForm((current) => ({ ...current, location: value }))} placeholder="Kampala, Uganda" required />
        <Field label="Preferred Search Area" value={form.preferredSearchArea} onChange={(value) => setForm((current) => ({ ...current, preferredSearchArea: value }))} placeholder="Najjera, Kira, Kololo..." />
        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button disabled={saving} className="h-11 rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save and continue'}</button>
      </form>
    </ModalShell>
  );
}

function PaymentModal({ open, onClose, selectedListing, message, setMessage, onUnlocked, onPaymentCreated }) {
  const FREE_UNLOCK_MODE = true;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (!selectedListing?.listingId) {
        throw new Error('Select a property to unlock.');
      }
      const response = await propertySeekerAPI.unlockListing(selectedListing.listingId);
      onUnlocked(response.data?.listing || null);
      setMessage(response.data?.alreadyUnlocked ? 'Property was already unlocked.' : 'Unlocked successfully. Free mode is active until Mobile Money integration is completed.');
      await onPaymentCreated();
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to unlock property.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-4xl">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
      <h2 className="text-xl font-bold text-slate-950">Unlock Property Views</h2>
      <p className="mt-2 text-sm text-slate-600">Unlock full details, exact location, and landlord contact.</p>
      {selectedListing ? <p className="mt-2 text-xs font-semibold text-slate-500">Selected: {safeText(selectedListing.title)}</p> : null}
      <form onSubmit={submit} className="mt-5 grid gap-5">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {FREE_UNLOCK_MODE ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Free unlock mode is active for now. Mobile Money billing will be enabled after gateway integration.</p> : null}
          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</p> : null}
          <button disabled={saving || !selectedListing?.listingId} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60">
            <Lock className="h-4 w-4" />
            {saving ? 'Unlocking...' : 'Pay & Unlock'}
          </button>
          <p className="text-center text-xs text-slate-500">No charge will be applied during this free period.</p>
        </div>
      </form>
    </ModalShell>
  );
}

function UnlockedListingModal({ listing, onClose, remainingViews }) {
  if (!listing) return null;
  const gallery = safeArray(listing.galleryImages);
  const mainImage = gallery[0]?.src || listing.coverImage;
  const expiresAt = listing.expiresAt ? new Date(listing.expiresAt) : null;
  const expiryText = expiresAt && !Number.isNaN(expiresAt.getTime())
    ? `Access expires ${expiresAt.toLocaleString()}`
    : 'Access expiry unavailable';
  const contact = listing.landlordContact;
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-6xl">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
      <div className="mb-4 pr-10">
        <h2 className="text-xl font-bold text-slate-950">{safeText(listing.title, 'Unlocked Property')}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Unlocked</span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{remainingViews} views remaining</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{expiryText}</span>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
            {mainImage ? <img src={mainImage} alt={listing.title || 'Property'} className="h-full w-full object-cover" /> : <PropertyPlaceholder />}
          </div>
          {gallery.length ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {gallery.slice(0, 4).map((image) => <img key={image.id} src={image.src} alt={image.alt} className="h-20 rounded-xl object-cover" />)}
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-2xl font-extrabold text-blue-700">{formatUGX(listing.rent)} <span className="text-sm font-semibold text-slate-500">/ month</span></p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-semibold text-slate-700">
            <span><BedDouble className="mr-1 inline h-4 w-4 text-slate-500" />{safeNumber(listing.bedrooms)} Bedrooms</span>
            <span><Bath className="mr-1 inline h-4 w-4 text-slate-500" />{safeNumber(listing.bathrooms)} Baths</span>
            <span><Building2 className="mr-1 inline h-4 w-4 text-slate-500" />{safeText(listing.propertyType || listing.unitType, 'Unit')}</span>
          </div>
          <section className="mt-5">
            <h3 className="text-sm font-bold text-slate-950">About this property</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{safeText(listing.fullDescription, 'No description provided.')}</p>
          </section>
          <section className="mt-5">
            <h3 className="text-sm font-bold text-slate-950">Location</h3>
            <p className="mt-2 text-sm text-slate-600">{safeText(listing.exactAddress)}</p>
            <button type="button" className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-blue-600 px-4 text-sm font-bold text-blue-700"><MapPin className="h-4 w-4" />View on Map</button>
          </section>
          <section className="mt-5">
            <h3 className="text-sm font-bold text-slate-950">Contact Landlord</h3>
            {contact ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <a href={`tel:${contact.phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-blue-600 text-sm font-bold text-blue-700"><Phone className="h-4 w-4" />Call Landlord</a>
                <a href={`https://wa.me/${String(contact.whatsapp || '').replace(/\D/g, '')}`} className="inline-flex h-11 items-center justify-center rounded-lg border border-emerald-500 text-sm font-bold text-emerald-700">WhatsApp</a>
              </div>
            ) : <p className="mt-2 text-sm text-slate-500">Landlord contact reveal is disabled for this listing.</p>}
          </section>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700"><Heart className="h-4 w-4" />Save Property</button>
            <button type="button" disabled={!listing.bookingAllowed} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white disabled:bg-slate-300"><CalendarCheck className="h-4 w-4" />Book Visit</button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function DashboardView({ dashboard, isPropertySeeker, onLogin, onUnlockAgain }) {
  if (!isPropertySeeker) {
    return (
      <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center">
        <div>
          <Lock className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Property seeker dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with Google to view your unlocked listings, payment history, and remaining views.</p>
          <button type="button" onClick={onLogin} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Continue with Google</button>
        </div>
      </main>
    );
  }

  const stats = dashboard?.stats || {};
  const unlocks = safeArray(dashboard?.unlockedListings);
  const transactions = safeArray(dashboard?.transactions);
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-950">Property Seeker Dashboard</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard label="Total Views Purchased" value={safeNumber(stats.totalViewsPurchased)} />
        <DashboardCard label="Remaining Views" value={safeNumber(stats.remainingViews)} />
        <DashboardCard label="Used Views" value={safeNumber(stats.usedViews)} />
        <DashboardCard label="Total Amount Spent" value={formatUGX(stats.totalAmountSpent || 0)} />
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Unlocked Listings</h2>
        <div className="responsive-table mt-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Property</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Expires At</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {unlocks.length ? unlocks.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{safeText(item.property)}</td>
                  <td className="px-4 py-3 text-slate-600">{safeText(item.location)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{safeText(item.status)}</span></td>
                  <td className="px-4 py-3 text-slate-600">{item.expiresAt ? new Date(item.expiresAt).toLocaleString() : 'N/A'}</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => onUnlockAgain(item)} className="rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-bold text-blue-700">{item.status === 'active' ? 'View Property' : 'Unlock Again'}</button></td>
                </tr>
              )) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No unlocked listings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Payment History</h2>
        <div className="mt-4 grid gap-3">
          {transactions.length ? transactions.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div><p className="font-semibold text-slate-900">{safeText(item.transactionId)}</p><p className="text-sm text-slate-500">{safeNumber(item.selectedViews)} views</p></div>
              <p className="font-bold text-slate-900">{formatUGX(item.amount || 0)}</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{safeText(item.status)}</span>
            </div>
          )) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No payments yet.</p>}
        </div>
      </section>
    </main>
  );
}

function DashboardCard({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div>;
}

function Field({ label, value, onChange, placeholder = '', required = false }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
    </label>
  );
}

function ModalShell({ children, onClose, maxWidth = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close overlay" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6`}>
        {children}
      </div>
    </div>
  );
}
