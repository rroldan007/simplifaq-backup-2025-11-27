import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useAuth } from '../hooks/useAuth';
import type { User } from '../contexts/authTypes';
import { api } from '../services/api';
import { sanitizeTextInput } from '../utils/security';
import { LogoUpload } from '../components/settings/LogoUpload';
import { SwissAddressAutocomplete } from '../components/clients/SwissAddressAutocomplete';
import { FloatingLabelInput } from '../components/ui/FloatingLabelInput';
import { ColorPicker } from '../components/ui/ColorPicker';
import { PDFThemeEditor } from '../components/settings/PDFThemeEditor';

// Theme color configurations
const THEME_COLORS: Record<string, {
  primary: string;
  headerBg: string;
  tableHeaderBg: string;
  headerText: string;
  bodyText: string;
}> = {
  swiss_minimal: {
    primary: '#000000',
    headerBg: '#FFFFFF',
    tableHeaderBg: '#F3F4F6',
    headerText: '#000000',
    bodyText: '#333333'
  },
  modern_blue: {
    primary: '#2563EB',
    headerBg: '#EFF6FF',
    tableHeaderBg: '#DBEAFE',
    headerText: '#1E3A8A',
    bodyText: '#334155'
  },
  creative_bold: {
    primary: '#7C3AED',
    headerBg: '#7C3AED',
    tableHeaderBg: '#EDE9FE',
    headerText: '#FFFFFF',
    bodyText: '#1F2937'
  }
};

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'company' | 'payments' | 'account' | 'preferences' | 'pdf' | 'numbering' | 'smtp'>('company');
  const user = useCurrentUser();
  const { updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingIban, setSavingIban] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const extractUserFromResponse = (payload: unknown): User | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const maybeRootUser = (payload as { user?: unknown }).user;
    if (maybeRootUser && typeof maybeRootUser === 'object') {
      return maybeRootUser as User;
    }

    const apiLayer = (payload as { data?: unknown }).data;
    if (apiLayer && typeof apiLayer === 'object') {
      const directUser = (apiLayer as { user?: unknown }).user;
      if (directUser && typeof directUser === 'object') {
        return directUser as User;
      }

      const nestedData = (apiLayer as { data?: unknown }).data;
      if (nestedData && typeof nestedData === 'object') {
        const nestedUser = (nestedData as { user?: unknown }).user;
        if (nestedUser && typeof nestedUser === 'object') {
          return nestedUser as User;
        }
      }
    }

    return null;
  };

  // Company form state - Initialize empty, will sync via useEffect when user loads
  const [company, setCompany] = useState({
    companyName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    canton: '',
    country: 'Suisse',
    vatNumber: '',
    website: '',
  });

  // Extended user type for settings fields
  type ExtendedUser = User & {
    vatNumber?: string;
    website?: string;
    iban?: string;
    bankApiKey?: string;
    bankApiProvider?: string;
    bankSyncEnabled?: boolean;
    firstName?: string;
    lastName?: string;
    phone?: string;
    invoicePrefix?: string;
    nextInvoiceNumber?: number;
    invoicePadding?: number;
    invoiceYearInPrefix?: boolean;
    invoiceYearFormat?: 'YYYY' | 'YY' | '';
    invoiceAutoReset?: boolean;
    lastInvoiceYear?: number;
    quotePrefix?: string;
    nextQuoteNumber?: number;
    quotePadding?: number;
    quoteYearInPrefix?: boolean;
    quoteYearFormat?: 'YYYY' | 'YY' | '';
    quoteAutoReset?: boolean;
    lastQuoteYear?: number;
  };

  // Sync form when user context updates (e.g., after logo upload or profile save)
  useEffect(() => {
    if (!user) return;
    const extUser = user as ExtendedUser;

    setCompany({
      companyName: user.companyName || '',
      email: user.email || '',
      phone: user.phone || '',
      street: user.address?.street || '',
      city: user.address?.city || '',
      postalCode: user.address?.postalCode || '',
      canton: user.address?.canton || '',
      country: user.address?.country || 'Suisse',
      vatNumber: extUser.vatNumber || '',
      website: extUser.website || '',
    });

    setIban(extUser.iban || '');
    setBankApiKey(extUser.bankApiKey || '');
    setBankApiProvider(extUser.bankApiProvider || '');
    setBankSyncEnabled(extUser.bankSyncEnabled || false);

    setProfile({
      firstName: extUser.firstName || '',
      lastName: extUser.lastName || '',
      email: user?.email || '',
      phone: extUser.phone || '',
    });

    setInvoiceNumbering({
      prefix: extUser.invoicePrefix || '',
      nextNumber: extUser.nextInvoiceNumber || 1,
      padding: extUser.invoicePadding || 0,
      yearInPrefix: extUser.invoiceYearInPrefix ?? false,
      yearFormat: extUser.invoiceYearFormat || 'YYYY',
      autoReset: extUser.invoiceAutoReset ?? true,
    });

    setQuoteNumbering({
      prefix: extUser.quotePrefix || '',
      nextNumber: extUser.nextQuoteNumber || 1,
      padding: extUser.quotePadding || 0,
      yearInPrefix: extUser.quoteYearInPrefix ?? false,
      yearFormat: extUser.quoteYearFormat || 'YYYY',
      autoReset: extUser.quoteAutoReset ?? true,
    });
  }, [user]);

  // Paiements (IBAN) - Initialize empty, will sync via useEffect
  const [iban, setIban] = useState<string>('');
  const [bankApiKey, setBankApiKey] = useState<string>('');
  const [bankApiProvider, setBankApiProvider] = useState<string>('');
  const [bankSyncEnabled, setBankSyncEnabled] = useState<boolean>(false);

  // Compte (Profil) - Initialize empty, will sync via useEffect
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Compte (Mot de passe)
  const [pwd, setPwd] = useState({ old: '', neu: '', conf: '' });

  // Numérotation (Facturas) - Initialize empty, will sync via useEffect
  const [invoiceNumbering, setInvoiceNumbering] = useState({
    prefix: '',
    nextNumber: 1,
    padding: 0,
    yearInPrefix: false,
    yearFormat: 'YYYY' as 'YYYY' | 'YY' | '',
    autoReset: true,
  });

  // Numérotation (Devis) - Initialize empty, will sync via useEffect
  const [quoteNumbering, setQuoteNumbering] = useState({
    prefix: '',
    nextNumber: 1,
    padding: 0,
    yearInPrefix: false,
    yearFormat: 'YYYY' as 'YYYY' | 'YY' | '',
    autoReset: true,
  });

  const [savingNumbering, setSavingNumbering] = useState(false);

  const handleSaveCompany = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        companyName: sanitizeTextInput(company.companyName),
        email: sanitizeTextInput(company.email),
        phone: sanitizeTextInput(company.phone),
        // send nested address as most backends expect
        address: {
          street: sanitizeTextInput(company.street),
          city: sanitizeTextInput(company.city),
          postalCode: sanitizeTextInput(company.postalCode),
          canton: sanitizeTextInput(company.canton),
          country: sanitizeTextInput(company.country),
        },
        // also include flat fields for backward-compat if backend tolerates
        street: sanitizeTextInput(company.street),
        city: sanitizeTextInput(company.city),
        postalCode: sanitizeTextInput(company.postalCode),
        canton: sanitizeTextInput(company.canton),
        country: sanitizeTextInput(company.country),
        vatNumber: sanitizeTextInput(company.vatNumber),
        website: sanitizeTextInput(company.website),
      };
      const updated = await api.updateMyProfile(payload);
      updateUser(updated as User);
    } finally {
      setSaving(false);
    }
  };

  const validateSwissIBAN = (val: string): string | null => {
    const s = (val || '').replace(/\s+/g, '').toUpperCase();
    if (!s) return null; // autoriser vide
    if (!/^CH[0-9A-Z]{19}$/.test(s)) return "Format IBAN invalide (ex: CHXX XXXX XXXX XXXX XXXX X)";
    return null;
  };

  const handleSaveIban = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = validateSwissIBAN(iban);
    if (err) {
      showToast(err, 'error');
      return;
    }
    setSavingIban(true);
    try {
      const payload: Record<string, unknown> = { 
        iban: (iban || '').replace(/\s+/g, '').toUpperCase(),
        bankApiKey: bankApiKey || null,
        bankApiProvider: bankApiProvider || null,
        bankSyncEnabled: bankSyncEnabled,
      };
      const updated = await api.updateMyProfile(payload);
      updateUser(updated as User);
      showToast('Configuration des paiements enregistrée', 'success');
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSavingIban(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: sanitizeTextInput(profile.firstName),
        lastName: sanitizeTextInput(profile.lastName),
        // email est géré côté auth pour login; si backend accepte: ajouter ici
        phone: sanitizeTextInput(profile.phone),
      };
      const updated = await api.updateMyProfile(payload);
      updateUser(updated as User);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pwd.old || !pwd.neu || !pwd.conf) {
      showToast('Veuillez compléter tous les champs du mot de passe', 'error');
      return;
    }
    if (pwd.neu.length < 8) {
      showToast('Le nouveau mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }
    if (pwd.neu !== pwd.conf) {
      showToast('La confirmation du mot de passe ne correspond pas', 'error');
      return;
    }
    setChangingPwd(true);
    try {
      await api.changePassword(pwd.old, pwd.neu);
      setPwd({ old: '', neu: '', conf: '' });
      showToast('Mot de passe modifié avec succès', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erreur lors du changement du mot de passe", 'error');
    } finally {
      setChangingPwd(false);
    }
  };

  const handleSaveInvoiceNumbering = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSavingNumbering(true);
    try {
      const payload = {
        prefix: invoiceNumbering.prefix.trim(),
        nextNumber: Number(invoiceNumbering.nextNumber),
        padding: Number(invoiceNumbering.padding),
        yearInPrefix: invoiceNumbering.yearInPrefix,
        yearFormat: invoiceNumbering.yearFormat,
        autoReset: invoiceNumbering.autoReset,
      };
      
      await api.put('/auth/me', {
        invoicePrefix: payload.prefix,
        nextInvoiceNumber: payload.nextNumber,
        invoicePadding: payload.padding,
        invoiceYearInPrefix: payload.yearInPrefix,
        invoiceYearFormat: payload.yearFormat,
        invoiceAutoReset: payload.autoReset,
      });
      
      showToast('Numérotation des factures mise à jour avec succès', 'success');
      
      // Update user context
      if (user) {
        updateUser({
          ...user,
          invoicePrefix: payload.prefix,
          nextInvoiceNumber: payload.nextNumber,
          invoicePadding: payload.padding,
          invoiceYearInPrefix: payload.yearInPrefix,
          invoiceYearFormat: payload.yearFormat,
          invoiceAutoReset: payload.autoReset,
        } as User);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erreur lors de la mise à jour", 'error');
    } finally {
      setSavingNumbering(false);
    }
  };

  const handleSaveQuoteNumbering = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSavingNumbering(true);
    try {
      const payload = {
        prefix: quoteNumbering.prefix.trim(),
        nextNumber: Number(quoteNumbering.nextNumber),
        padding: Number(quoteNumbering.padding),
        yearInPrefix: quoteNumbering.yearInPrefix,
        yearFormat: quoteNumbering.yearFormat,
        autoReset: quoteNumbering.autoReset,
      };
      
      await api.put('/auth/me', {
        quotePrefix: payload.prefix,
        nextQuoteNumber: payload.nextNumber,
        quotePadding: payload.padding,
        quoteYearInPrefix: payload.yearInPrefix,
        quoteYearFormat: payload.yearFormat,
        quoteAutoReset: payload.autoReset,
      });
      
      showToast('Numérotation des devis mise à jour avec succès', 'success');
      
      // Update user context
      if (user) {
        updateUser({
          ...user,
          quotePrefix: payload.prefix,
          nextQuoteNumber: payload.nextNumber,
          quotePadding: payload.padding,
          quoteYearInPrefix: payload.yearInPrefix,
          quoteYearFormat: payload.yearFormat,
          quoteAutoReset: payload.autoReset,
        } as User);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erreur lors de la mise à jour", 'error');
    } finally {
      setSavingNumbering(false);
    }
  };

  const generateNumberExample = (
    prefix: string, 
    nextNumber: number, 
    padding: number,
    yearInPrefix: boolean = false,
    yearFormat: 'YYYY' | 'YY' | '' = 'YYYY'
  ): string => {
    const pad = Math.max(0, Number(padding || 0));
    const numeric = String(nextNumber);
    const padded = pad > 0 ? numeric.padStart(pad, '0') : numeric;
    const pref = (prefix || '').trim();
    
    // Format year if enabled
    let yearPart = '';
    if (yearInPrefix && yearFormat) {
      const currentYear = new Date().getFullYear();
      if (yearFormat === 'YYYY') {
        yearPart = String(currentYear);
      } else if (yearFormat === 'YY') {
        yearPart = String(currentYear).slice(-2);
      }
    }
    
    // Build final number: PREFIX-YEAR-NUMBER or PREFIX-NUMBER or just NUMBER
    const parts: string[] = [];
    if (pref) parts.push(pref);
    if (yearPart) parts.push(yearPart);
    parts.push(padded);
    
    return parts.join('-');
  };

  // Wait for user to load before rendering
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded shadow-md border text-sm ${toast.type==='success'?'bg-green-50 border-green-300 text-green-800':toast.type==='error'?'bg-red-50 border-red-300 text-red-800':'bg-slate-50 border-slate-300 text-slate-800'}`}>
          {toast.msg}
        </div>
      )}

      <div className="rounded-lg border bg-white">
        <div className="flex border-b">
          <button className={`px-4 py-2 text-sm ${activeTab==='company'?'border-b-2 border-blue-600 text-blue-700':'text-slate-600'}`} onClick={()=>setActiveTab('company')}>Société</button>
          <button className={`px-4 py-2 text-sm ${activeTab==='pdf'?'border-b-2 border-blue-600 text-blue-700':'text-slate-600'}`} onClick={()=>setActiveTab('pdf')}>Apparence PDF</button>
          <button className={`px-4 py-2 text-sm ${activeTab==='numbering'?'border-b-2 border-blue-600 text-blue-700':'text-slate-600'}`} onClick={()=>setActiveTab('numbering')}>Numérotation</button>
          <button className={`px-4 py-2 text-sm ${activeTab==='payments'?'border-b-2 border-blue-600 text-blue-700':'text-slate-600'}`} onClick={()=>setActiveTab('payments')}>Paiements</button>
          <button className={`px-4 py-2 text-sm ${activeTab==='account'?'border-b-2 border-blue-600 text-blue-700':'text-slate-600'}`} onClick={()=>setActiveTab('account')}>Compte</button>
          <button className={`px-4 py-2 text-sm ${activeTab==='smtp'?'border-b-2 border-blue-600 text-blue-700':'text-slate-600'}`} onClick={()=>setActiveTab('smtp')}>Configuration Email</button>
          <button className={`px-4 py-2 text-sm ${activeTab==='preferences'?'border-b-2 border-blue-600 text-blue-700':'text-slate-600'}`} onClick={()=>setActiveTab('preferences')}>Préférences</button>
        </div>

        <div className="p-4">
          {activeTab === 'company' && (
            <form onSubmit={handleSaveCompany} className="space-y-8 max-w-5xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Informations de la Société
                </h3>
                <p className="text-sm text-slate-600">
                  Gérez les informations de votre entreprise qui apparaîtront sur vos documents
                </p>
              </div>

              {/* Main Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold text-slate-800">Informations Principales</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FloatingLabelInput
                    label="Nom de la société *"
                    value={company.companyName}
                    onChange={(e)=>setCompany(prev=>({...prev, companyName:e.target.value}))}
                  />
                  
                  <FloatingLabelInput
                    label="Email professionnel *"
                    type="email"
                    value={company.email}
                    onChange={(e)=>setCompany(prev=>({...prev, email:e.target.value}))}
                  />
                  
                  <FloatingLabelInput
                    label="Téléphone"
                    type="tel"
                    value={company.phone}
                    onChange={(e)=>setCompany(prev=>({...prev, phone:e.target.value}))}
                  />

                  <FloatingLabelInput
                    label="Site web"
                    type="url"
                    value={company.website}
                    onChange={(e)=>setCompany(prev=>({...prev, website:e.target.value}))}
                  />
                  
                  <FloatingLabelInput
                    label="Numéro TVA"
                    value={company.vatNumber}
                    onChange={(e)=>setCompany(prev=>({...prev, vatNumber:e.target.value}))}
                  />
                </div>
              </div>

              {/* Address Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h4 className="font-semibold text-slate-800">Adresse</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <SwissAddressAutocomplete
                      label="Rue et numéro"
                      value={company.street}
                      onChange={(v)=>setCompany(prev=>({...prev, street:v}))}
                      onAddressSelected={(addr)=>{
                        setCompany(prev=>({
                          ...prev,
                          street: addr.street || prev.street,
                          city: addr.city || prev.city,
                          postalCode: addr.postalCode || prev.postalCode,
                          canton: addr.canton || prev.canton,
                          country: addr.country || prev.country,
                        }));
                      }}
                      floatingLabel
                    />
                  </div>
                  
                  <FloatingLabelInput
                    label="Code postal"
                    value={company.postalCode}
                    onChange={(e)=>setCompany(prev=>({...prev, postalCode:e.target.value}))}
                  />
                  
                  <FloatingLabelInput
                    label="Ville"
                    value={company.city}
                    onChange={(e)=>setCompany(prev=>({...prev, city:e.target.value}))}
                  />
                  
                  <FloatingLabelInput
                    label="Canton"
                    value={company.canton}
                    onChange={(e)=>setCompany(prev=>({...prev, canton:e.target.value}))}
                  />
                  
                  <FloatingLabelInput
                    label="Pays"
                    value={company.country}
                    onChange={(e)=>setCompany(prev=>({...prev, country:e.target.value}))}
                  />
                </div>
              </div>

              {/* Logo Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold text-slate-800">Logo de l'Entreprise</h4>
                </div>
                
                <LogoUpload currentLogoUrl={(user as unknown as { logoUrl?: string })?.logoUrl} className="" />
                
                <div className="mt-4 flex items-start gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-700">
                    Votre logo apparaîtra sur toutes vos factures et devis. Format recommandé: PNG ou SVG, taille maximale 2MB.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  onClick={()=>navigate(-1)}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'payments' && (
            <form onSubmit={handleSaveIban} className="max-w-xl space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">IBAN (Suisse)</label>
                <input value={iban} onChange={(e)=>setIban(e.target.value)} placeholder="CHxx xxxx xxxx xxxx xxxx x" />
                <p className="text-xs text-slate-500 mt-1">Accepte IBAN / QR‑IBAN suisses. Laissez vide pour retirer.</p>
              </div>

              <div className="border-t pt-4 mt-6">
                <h3 className="text-base font-semibold mb-3 text-slate-700">Intégration bancaire (optionnel)</h3>
                <p className="text-sm text-slate-600 mb-4">Connectez votre banque pour synchroniser automatiquement les paiements reçus.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Fournisseur bancaire</label>
                    <select 
                      value={bankApiProvider} 
                      onChange={(e)=>setBankApiProvider(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Sélectionner --</option>
                      <option value="postfinance">PostFinance</option>
                      <option value="ubs">UBS</option>
                      <option value="credit-suisse">Credit Suisse</option>
                      <option value="raiffeisen">Raiffeisen</option>
                      <option value="bexio">Bexio</option>
                      <option value="other">Autre</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Votre institution bancaire suisse</p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Clé API bancaire</label>
                    <input 
                      type="password"
                      value={bankApiKey} 
                      onChange={(e)=>setBankApiKey(e.target.value)} 
                      placeholder="Votre clé API (sera chiffrée)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">⚠️ Cette clé sera chiffrée en AES-256 avant stockage</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="bankSyncEnabled"
                      checked={bankSyncEnabled} 
                      onChange={(e)=>setBankSyncEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="bankSyncEnabled" className="text-sm text-slate-700">
                      Activer la synchronisation automatique des paiements
                    </label>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <p className="text-xs text-amber-800">
                      <strong>Note:</strong> La synchronisation bancaire automatique récupère les paiements reçus et met à jour automatiquement le statut de vos factures. Consultez la documentation de votre banque pour obtenir une clé API.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" disabled={savingIban}>
                  {savingIban?'Enregistrement...':'Enregistrer la configuration'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'account' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <h3 className="text-base font-semibold">Profil</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Prénom</label>
                    <input value={profile.firstName} onChange={(e)=>setProfile(p=>({...p, firstName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Nom</label>
                    <input value={profile.lastName} onChange={(e)=>setProfile(p=>({...p, lastName:e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">Email</label>
                    <input value={profile.email} onChange={(e)=>setProfile(p=>({...p, email:e.target.value}))} disabled />
                    <p className="text-xs text-slate-500 mt-1">L'email de connexion n'est pas modifiable ici.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">Téléphone</label>
                    <input value={profile.phone} onChange={(e)=>setProfile(p=>({...p, phone:e.target.value}))} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={saving}>{saving?'Enregistrement...':'Enregistrer'}</button>
                </div>
              </form>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <h3 className="text-base font-semibold">Mot de passe</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Ancien mot de passe</label>
                    <input type="password" value={pwd.old} onChange={(e)=>setPwd(p=>({...p, old:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Nouveau mot de passe</label>
                    <input type="password" value={pwd.neu} onChange={(e)=>setPwd(p=>({...p, neu:e.target.value}))} />
                    <p className="text-xs text-slate-500 mt-1">Au moins 8 caractères.</p>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Confirmer le mot de passe</label>
                    <input type="password" value={pwd.conf} onChange={(e)=>setPwd(p=>({...p, conf:e.target.value}))} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={changingPwd}>{changingPwd?'Changement...':'Changer le mot de passe'}</button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="text-slate-600 text-sm">
              Préférences générales à venir...
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-600 rounded-lg p-3 text-white">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-indigo-900 mb-2">
                      Configuration SMTP Personnalisée
                    </h3>
                    <p className="text-indigo-800 mb-4">
                      Envoyez vos factures et devis directement depuis votre propre serveur email (Gmail, Outlook, SendGrid, etc.) avec votre identité de marque.
                    </p>
                    <ul className="text-sm text-indigo-700 space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Presets inclus:</strong> Gmail, Outlook, Office365, SendGrid, Mailgun</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Test de connexion:</strong> Vérifiez votre configuration avant l'envoi</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Statistiques détaillées:</strong> Suivez vos envois et taux de succès</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span><strong>Sécurité:</strong> Vos mots de passe sont chiffrés en AES-256</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => navigate('/settings/smtp')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configurer mon serveur SMTP
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-yellow-600 text-xl">⚠️</div>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-yellow-900 mb-1">Note importante</h5>
                    <p className="text-sm text-yellow-800">
                      Pour utiliser Gmail, vous devez générer un <strong>mot de passe d'application</strong> depuis les paramètres de sécurité de votre compte Google (pas votre mot de passe habituel).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pdf' && user && !showAdvancedEditor && (
            <div className="space-y-8 max-w-4xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Personnalisation PDF
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Personnalisez l'apparence de vos documents PDF (factures, devis, etc.)
                </p>
              </div>

              {/* Selección de Tema */}
              <div className="border border-slate-200 rounded-lg p-6 bg-white">
                <h4 className="text-base font-semibold text-slate-800 mb-4">
                  Modèle de Document
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Choisir un modèle
                    </label>
                    <select 
                      value={user.pdfTemplate || 'swiss_minimal'}
                      onChange={async (e) => {
                        try {
                          setSaving(true);
                          const updateData: any = { pdfTemplate: e.target.value };
                          
                          // Si se selecciona un tema estándar, limpiar la configuración avanzada
                          if (e.target.value !== 'custom') {
                            updateData.pdfAdvancedConfig = null;
                          }
                          
                          const result = await api.put('/auth/me', updateData);
                          const updated = extractUserFromResponse(result);
                          if (updated) {
                            updateUser(updated);
                            showToast('Modèle mis à jour avec succès', 'success');
                          }
                        } catch (error) {
                          showToast('Erreur lors de la mise à jour', 'error');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="swiss_minimal">Swiss Minimal</option>
                      <option value="modern_blue">Modern Blue</option>
                      <option value="creative_bold">Creative Bold</option>
                      <option value="custom">✨ Personnalisé</option>
                    </select>
                    {user.pdfTemplate === 'custom' && (
                      <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Vous utilisez une configuration personnalisée. Pour revenir à un thème standard, ouvrez l'éditeur avancé et sélectionnez un thème.
                      </p>
                    )}
                  </div>

                  <div>
                    <ColorPicker
                      label="Couleur principale"
                      value={user.pdfPrimaryColor || '#000000'}
                      onChange={async (color) => {
                        try {
                          const result = await api.put('/auth/me', { pdfPrimaryColor: color });
                          const updated = extractUserFromResponse(result);
                          if (updated) {
                            updateUser(updated);
                            showToast('Couleur mise à jour', 'success');
                          }
                        } catch (error) {
                          showToast('Erreur lors de la mise à jour', 'error');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Botón Editor Avanzado */}
              <div className="border border-indigo-200 rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-4xl">
                    🎨
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-slate-800 mb-2">
                      Personnalisation Avancée
                    </h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Éditeur visuel complet pour personnaliser la position, taille et visibilité de chaque élément de vos documents.
                    </p>
                    <button
                      onClick={() => setShowAdvancedEditor(true)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
                    >
                      Ouvrir l'Éditeur Avancé
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Simple - Only for predefined themes */}
              {user.pdfTemplate !== 'custom' && (() => {
                const themeKey = user.pdfTemplate || 'swiss_minimal';
                const themeColors = THEME_COLORS[themeKey] || THEME_COLORS.swiss_minimal;
                const primaryColor = user.pdfPrimaryColor || themeColors.primary;
                
                return (
              <div className="border border-slate-200 rounded-lg p-6 bg-white">
                <h4 className="text-base font-semibold text-slate-800 mb-4">
                  Aperçu Simplifié
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="bg-white rounded shadow-sm p-6 max-w-2xl mx-auto" style={{ aspectRatio: '210/297' }}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6 pb-4 border-b" style={{ borderColor: primaryColor, backgroundColor: themeColors.headerBg }}>
                      <div className="flex items-center gap-4">
                        {user.logoUrl ? (
                          <img 
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/${user.logoUrl}`}
                            alt="Logo" 
                            className="h-12 w-auto object-contain" 
                          />
                        ) : (
                          <div className="h-12 w-16 bg-slate-200 rounded flex items-center justify-center text-2xl">
                            🏢
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-sm" style={{ color: themeColors.headerText }}>
                            {user.companyName || 'Votre Entreprise'}
                          </div>
                          <div className="text-xs text-slate-600">
                            {user.email || 'email@exemple.ch'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg" style={{ color: themeColors.headerText }}>
                          FACTURE
                        </div>
                        <div className="text-xs text-slate-600">
                          {user.invoicePrefix || 'FAC'}-001
                        </div>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="font-semibold mb-1" style={{ color: themeColors.headerText }}>
                            Entreprise
                          </div>
                          <div className="text-slate-600 space-y-0.5">
                            <div>{user.companyName || 'Nom'}</div>
                            <div>{user.street || 'Adresse'}</div>
                            <div>{user.postalCode} {user.city || 'Ville'}</div>
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold mb-1" style={{ color: themeColors.headerText }}>
                            Client
                          </div>
                          <div className="text-slate-600 space-y-0.5">
                            <div>Client Exemple</div>
                            <div>Rue Example 1</div>
                            <div>1000 Lausanne</div>
                          </div>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="border border-slate-200 rounded overflow-hidden">
                        <div className="grid grid-cols-4 gap-2 p-2 text-xs font-semibold" style={{ backgroundColor: themeColors.tableHeaderBg, color: themeColors.headerText }}>
                          <div>Description</div>
                          <div className="text-right">Qté</div>
                          <div className="text-right">Prix</div>
                          <div className="text-right">Total</div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 p-2 text-xs border-t border-slate-200">
                          <div>Service exemple</div>
                          <div className="text-right">1.00</div>
                          <div className="text-right">100.00</div>
                          <div className="text-right">100.00</div>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex justify-end">
                        <div className="text-sm w-48">
                          <div className="flex justify-between py-1">
                            <span>Sous-total:</span>
                            <span>CHF 100.00</span>
                          </div>
                          <div className="flex justify-between py-1 font-bold border-t" style={{ color: primaryColor }}>
                            <span>TOTAL:</span>
                            <span>CHF 100.00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  💡 Aperçu simplifié. Pour personnaliser la position et taille des éléments, utilisez l'éditeur avancé.
                </p>
              </div>
                );
              })()}
            </div>
          )}

          {/* Editor Avanzado en Pantalla Completa */}
          {showAdvancedEditor && user && (
            <div className="fixed inset-0 z-50 bg-white">
              <PDFThemeEditor 
                user={user}
                onUpdate={updateUser}
                onShowToast={showToast}
                onClose={() => setShowAdvancedEditor(false)}
              />
            </div>
          )}

          {activeTab === 'numbering' && (
            <div className="space-y-8 max-w-4xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Numérotation des Documents
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Configurez le format de numérotation pour vos factures et devis. Ces paramètres déterminent comment seront générés les numéros de vos documents.
                </p>
              </div>

              {/* Facturas */}
              <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                <h4 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-blue-600">📄</span>
                  Factures
                </h4>
                
                <form onSubmit={handleSaveInvoiceNumbering} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Préfixe <span className="text-slate-400 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="text"
                        value={invoiceNumbering.prefix}
                        onChange={(e) => setInvoiceNumbering({...invoiceNumbering, prefix: e.target.value})}
                        placeholder="FAC-2025"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 mt-1">Ex: FAC, INVOICE, 2025</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Prochain numéro
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={invoiceNumbering.nextNumber}
                        onChange={(e) => setInvoiceNumbering({...invoiceNumbering, nextNumber: parseInt(e.target.value) || 1})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 mt-1">Numéro de départ</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Zéros de remplissage
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={invoiceNumbering.padding}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          setInvoiceNumbering({...invoiceNumbering, padding: val});
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 mt-1">Ex: 3 = 001, 002, 003</p>
                    </div>
                  </div>

                  {/* Year Options for Invoices */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <span>📅</span> Options d'année fiscale
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="invoiceYearInPrefix"
                          checked={invoiceNumbering.yearInPrefix}
                          onChange={(e) => setInvoiceNumbering({...invoiceNumbering, yearInPrefix: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <label htmlFor="invoiceYearInPrefix" className="ml-2 text-sm text-slate-700">
                          Inclure l'année dans le numéro
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Format de l'année
                        </label>
                        <select
                          value={invoiceNumbering.yearFormat}
                          onChange={(e) => setInvoiceNumbering({...invoiceNumbering, yearFormat: e.target.value as 'YYYY' | 'YY' | ''})}
                          disabled={!invoiceNumbering.yearInPrefix}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          <option value="YYYY">2025 (YYYY)</option>
                          <option value="YY">25 (YY)</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="invoiceAutoReset"
                          checked={invoiceNumbering.autoReset}
                          onChange={(e) => setInvoiceNumbering({...invoiceNumbering, autoReset: e.target.checked})}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <label htmlFor="invoiceAutoReset" className="ml-2 text-sm text-slate-700">
                          Réinitialiser au 1er janvier
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {invoiceNumbering.autoReset 
                        ? "Le compteur sera automatiquement remis à 1 au début de chaque année fiscale."
                        : "Le compteur continuera sa séquence sans interruption."
                      }
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Aperçu du format</p>
                        <p className="text-xs text-slate-500 mt-1">Prochaine facture</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600 font-mono">
                          {generateNumberExample(invoiceNumbering.prefix, invoiceNumbering.nextNumber, invoiceNumbering.padding, invoiceNumbering.yearInPrefix, invoiceNumbering.yearFormat)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Suivante: {generateNumberExample(invoiceNumbering.prefix, invoiceNumbering.nextNumber + 1, invoiceNumbering.padding, invoiceNumbering.yearInPrefix, invoiceNumbering.yearFormat)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingNumbering}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingNumbering ? 'Enregistrement...' : 'Enregistrer la configuration'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Devis */}
              <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                <h4 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-green-600">📋</span>
                  Devis
                </h4>
                
                <form onSubmit={handleSaveQuoteNumbering} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Préfixe <span className="text-slate-400 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="text"
                        value={quoteNumbering.prefix}
                        onChange={(e) => setQuoteNumbering({...quoteNumbering, prefix: e.target.value})}
                        placeholder="DEV-2025"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 mt-1">Ex: DEV, QUOTE, 2025</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Prochain numéro
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quoteNumbering.nextNumber}
                        onChange={(e) => setQuoteNumbering({...quoteNumbering, nextNumber: parseInt(e.target.value) || 1})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 mt-1">Numéro de départ</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Zéros de remplissage
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={quoteNumbering.padding}
                        onChange={(e) => setQuoteNumbering({...quoteNumbering, padding: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 mt-1">Ex: 3 = 001, 002, 003</p>
                    </div>
                  </div>

                  {/* Year Options for Quotes */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <span>📅</span> Options d'année fiscale
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="quoteYearInPrefix"
                          checked={quoteNumbering.yearInPrefix}
                          onChange={(e) => setQuoteNumbering({...quoteNumbering, yearInPrefix: e.target.checked})}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300 rounded"
                        />
                        <label htmlFor="quoteYearInPrefix" className="ml-2 text-sm text-slate-700">
                          Inclure l'année dans le numéro
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Format de l'année
                        </label>
                        <select
                          value={quoteNumbering.yearFormat}
                          onChange={(e) => setQuoteNumbering({...quoteNumbering, yearFormat: e.target.value as 'YYYY' | 'YY' | ''})}
                          disabled={!quoteNumbering.yearInPrefix}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          <option value="YYYY">2025 (YYYY)</option>
                          <option value="YY">25 (YY)</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="quoteAutoReset"
                          checked={quoteNumbering.autoReset}
                          onChange={(e) => setQuoteNumbering({...quoteNumbering, autoReset: e.target.checked})}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300 rounded"
                        />
                        <label htmlFor="quoteAutoReset" className="ml-2 text-sm text-slate-700">
                          Réinitialiser au 1er janvier
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {quoteNumbering.autoReset 
                        ? "Le compteur sera automatiquement remis à 1 au début de chaque année fiscale."
                        : "Le compteur continuera sa séquence sans interruption."
                      }
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Aperçu du format</p>
                        <p className="text-xs text-slate-500 mt-1">Prochain devis</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600 font-mono">
                          {generateNumberExample(quoteNumbering.prefix, quoteNumbering.nextNumber, quoteNumbering.padding, quoteNumbering.yearInPrefix, quoteNumbering.yearFormat)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Suivant: {generateNumberExample(quoteNumbering.prefix, quoteNumbering.nextNumber + 1, quoteNumbering.padding, quoteNumbering.yearInPrefix, quoteNumbering.yearFormat)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingNumbering}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingNumbering ? 'Enregistrement...' : 'Enregistrer la configuration'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-blue-600 text-xl">💡</div>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-blue-900 mb-1">Conseils de numérotation</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Préfixe:</strong> Utilisez un préfixe unique pour différencier facilement vos documents (ex: FAC pour factures, DEV pour devis)</li>
                      <li>• <strong>Année:</strong> Activez "Inclure l'année" pour générer FAC-2025-001, puis FAC-2026-001 automatiquement</li>
                      <li>• <strong>Reset automatique:</strong> Active par défaut, le compteur repart à 1 chaque 1er janvier</li>
                      <li>• <strong>Padding:</strong> Utilisez au moins 3 zéros de remplissage pour un aspect professionnel (001, 002, 003...)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}