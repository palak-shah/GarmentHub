import { useState, useMemo } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';

import { CheckCircle2, Circle } from 'lucide-react';

import { curationApi } from '@/api/curation.api';

import { productApi } from '@/api/product.api';

import { useSelectionStore } from '@/store/selectionStore';

import { Header } from '@/components/layout/Header';

import { mediaUrl } from '@/utils/mediaUrl';

import { formatPrice } from '@/utils/formatters';

import { PageSpinner } from '@/components/ui/Spinner';

import { apiErrorMessage } from '@/utils/apiError';

import type { TraderGalleryShareLine } from '@/types';

import type { TraderCustomer } from '@/api/curation.api';

/** WhatsApp limits prefilled body length (~4k); trim so send always works. */
const MAX_WHATSAPP_CHARS = 3800;

function buildWhatsAppPrefillText(productNames: string[], note: string, appOrigin: string): string {
  const lines: string[] = [
    "I've shared a curated selection with you on GarmentHub — open the app and check Home.",
    '',
    ...productNames.map((n) => `• ${n}`),
  ];
  if (note.trim()) lines.push('', note.trim());
  lines.push('', `Open app: ${appOrigin}/`);
  let text = lines.join('\n');
  if (text.length > MAX_WHATSAPP_CHARS) {
    text = text.slice(0, MAX_WHATSAPP_CHARS - 1) + '…';
  }
  return text;
}



export default function ShareProducts() {

  const { selectedIds, clearSelection } = useSelectionStore();

  const navigate = useNavigate();

  const location = useLocation();

  const queryClient = useQueryClient();



  const galleryLines = (location.state as { shareLines?: TraderGalleryShareLine[] } | null)?.shareLines;

  const productIds = Array.from(selectedIds);



  const productIdsForPreview = useMemo(() => {

    if (galleryLines?.length) {

      return [...new Set(galleryLines.map((l) => l.productId))];

    }

    return productIds;

  }, [galleryLines, productIds]);



  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const [note, setNote] = useState('');

  const [orderMode, setOrderMode] = useState<'DIRECT' | 'MANAGED'>('DIRECT');

  const [offers, setOffers] = useState<Record<string, string>>({});



  const { data: customers, isLoading } = useQuery({

    queryKey: ['trader-customers'],

    queryFn: () => curationApi.getCustomers(),

  });



  const { data: customerGroups, isLoading: groupsLoading } = useQuery({

    queryKey: ['customer-groups'],

    queryFn: () => curationApi.listCustomerGroups(),

  });



  const { data: previewProducts, isLoading: previewLoading } = useQuery({

    queryKey: ['share-preview', [...productIdsForPreview].sort().join(','), galleryLines?.length ?? 0],

    queryFn: () => Promise.all(productIdsForPreview.map((id) => productApi.getById(id))),

    enabled: productIdsForPreview.length > 0,

  });



  const shareMutation = useMutation({

    mutationFn: () =>

      curationApi.createShare({

        products: (() => {

          if (galleryLines?.length) {

            return galleryLines.map(({ productId, productImageId }) => {

              const raw = offers[productId]?.trim() ?? '';

              if (!raw) return { productId, productImageId };

              const n = parseFloat(raw);

              return { productId, productImageId, traderOfferUnitPrice: n };

            });

          }

          return productIds.map((id) => {

            const raw = offers[id]?.trim() ?? '';

            if (!raw) return { productId: id };

            const n = parseFloat(raw);

            return { productId: id, traderOfferUnitPrice: n };

          });

        })(),

        customerIds: Array.from(selectedCustomers),

        customerGroupIds: Array.from(selectedGroups),

        note: note || undefined,

        orderMode,

      }),

  });



  const submitShare = async (openWhatsApp: boolean) => {

    const idsToCheck = galleryLines?.length ? [...new Set(galleryLines.map((l) => l.productId))] : productIds;

    for (const id of idsToCheck) {

      const raw = offers[id]?.trim() ?? '';

      if (!raw) continue;

      const n = parseFloat(raw);

      if (Number.isNaN(n) || n <= 0) {

        toast.error('Enter a positive price per line, or leave blank to use the list price');

        return;

      }

    }

    let popup: Window | null = null;

    if (openWhatsApp) popup = window.open('about:blank', '_blank');

    try {

      await shareMutation.mutateAsync();

      if (openWhatsApp && previewProducts?.length) {

        const names = previewProducts.map((p) => p.name);

        const message = buildWhatsAppPrefillText(names, note, window.location.origin);

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;

        if (popup) popup.location.href = url;

        else window.open(url, '_blank', 'noopener,noreferrer');

      } else {

        popup?.close();

      }

      clearSelection();

      queryClient.invalidateQueries({ queryKey: ['curation-sent'] });

      toast.success(openWhatsApp ? 'Shared! Pick a WhatsApp chat to notify.' : 'Shared!');

      navigate('/', { replace: true });

    } catch (e: unknown) {

      try {

        popup?.close();

      } catch {

        /* ignore */

      }

      toast.error(apiErrorMessage(e, 'Failed to share'));

    }

  };



  const toggleCustomer = (id: string) => {

    setSelectedCustomers((prev) => {

      const next = new Set(prev);

      if (next.has(id)) next.delete(id);

      else next.add(id);

      return next;

    });

  };



  const selectAllCustomers = () => {

    if (!customers) return;

    const allIds = customers.map((c) => c.id);

    const allSelected = allIds.every((id) => selectedCustomers.has(id));

    if (allSelected) setSelectedCustomers(new Set());

    else setSelectedCustomers(new Set(allIds));

  };



  const toggleGroup = (id: string) => {

    setSelectedGroups((prev) => {

      const next = new Set(prev);

      if (next.has(id)) next.delete(id);

      else next.add(id);

      return next;

    });

  };



  if (isLoading || groupsLoading || previewLoading || !previewProducts) return <PageSpinner />;



  if (productIdsForPreview.length === 0) {

    return (

      <>

        <Header title="Share" showBack />

        <div className="mx-auto max-w-4xl px-4 py-8 text-center text-sm text-gray-600">

          Select products or photos first, then open Share again.

        </div>

      </>

    );

  }



  const allCustomerIds = customers?.map((c) => c.id) ?? [];

  const allSelected = allCustomerIds.length > 0 && allCustomerIds.every((id) => selectedCustomers.has(id));



  const hasRecipients = selectedCustomers.size > 0 || selectedGroups.size > 0;

  const approxRecipientHint =

    selectedCustomers.size > 0 && selectedGroups.size > 0

      ? `${selectedCustomers.size} individual(s) + ${selectedGroups.size} group(s) — duplicates merged when sending`

      : selectedGroups.size > 0

        ? `${selectedGroups.size} group(s) — all members who follow you`

        : `${selectedCustomers.size} customer(s)`;



  const shareTitle = galleryLines?.length

    ? `Share ${galleryLines.length} photo${galleryLines.length === 1 ? '' : 's'}`

    : `Share ${productIds.length} items`;



  return (

    <>

      <Header title={shareTitle} showBack />



      <div className="mx-auto max-w-4xl px-4 py-4 pb-32 space-y-5">

        <div>

          <div className="flex items-center justify-between mb-2">

            <p className="text-sm font-bold text-gray-900">Send to individuals</p>

            {allCustomerIds.length > 1 && (

              <button

                type="button"

                onClick={selectAllCustomers}

                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium active:bg-gray-100 min-h-[36px]"

              >

                {allSelected ? (

                  <CheckCircle2 className="h-4 w-4 text-primary-600" />

                ) : (

                  <Circle className="h-4 w-4 text-gray-300" />

                )}

                All

              </button>

            )}

          </div>



          {!customers || customers.length === 0 ? (

            <p className="text-sm text-gray-400 py-4 text-center">No customers following you yet</p>

          ) : (

            <div className="space-y-1">

              {customers.map((c: TraderCustomer) => (

                <button

                  key={c.id}

                  type="button"

                  onClick={() => toggleCustomer(c.id)}

                  className={`flex w-full items-center gap-3 rounded-xl p-3 min-h-[56px] text-left ${

                    selectedCustomers.has(c.id) ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-gray-100'

                  }`}

                >

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">

                    {(c.businessName || c.name || '?')[0].toUpperCase()}

                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="truncate text-sm font-semibold text-gray-900">{c.businessName || c.name}</p>

                  </div>

                  {selectedCustomers.has(c.id) ? (

                    <CheckCircle2 className="h-5 w-5 text-primary-600 shrink-0" />

                  ) : (

                    <Circle className="h-5 w-5 text-gray-300 shrink-0" />

                  )}

                </button>

              ))}

            </div>

          )}

        </div>



        <div>

          <div className="flex items-center justify-between mb-2">

            <p className="text-sm font-bold text-gray-900">Send to groups</p>

            <button

              type="button"

              onClick={() => navigate('/trader/groups')}

              className="text-xs font-semibold text-primary-600 active:text-primary-700"

            >

              Manage groups

            </button>

          </div>

          {!customerGroups?.length ? (

            <p className="text-sm text-gray-400 py-3 rounded-xl border border-dashed border-gray-200 px-3 text-center">

              No customer groups yet.{' '}

              <button type="button" onClick={() => navigate('/trader/groups')} className="font-semibold text-primary-600">

                Create one

              </button>{' '}

              to share to many buyers at once.

            </p>

          ) : (

            <div className="space-y-1">

              {customerGroups.map((g) => (

                <button

                  key={g.id}

                  type="button"

                  onClick={() => toggleGroup(g.id)}

                  className={`flex w-full items-center gap-3 rounded-xl p-3 min-h-[56px] text-left ${

                    selectedGroups.has(g.id) ? 'bg-violet-50 border border-violet-200' : 'bg-white border border-gray-100'

                  }`}

                >

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">

                    {(g.name || '?')[0].toUpperCase()}

                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="truncate text-sm font-semibold text-gray-900">{g.name}</p>

                    <p className="text-xs text-gray-400">

                      {g._count.members} member{g._count.members !== 1 ? 's' : ''}

                    </p>

                  </div>

                  {selectedGroups.has(g.id) ? (

                    <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0" />

                  ) : (

                    <Circle className="h-5 w-5 text-gray-300 shrink-0" />

                  )}

                </button>

              ))}

            </div>

          )}

        </div>



        <div>

          <p className="text-sm font-bold text-gray-900 mb-1">Your offer to the customer (optional)</p>

          <p className="text-xs text-gray-500 mb-3">

            Set a better unit price per product if you want — it applies to every selected photo from that product unless

            specified per line later. Leave blank to use the vendor list price.

          </p>

          <div className="space-y-3">

            {previewProducts.map((p) => (

              <div key={p.id} className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 items-start">

                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">

                  {p.images?.[0] ? <img src={mediaUrl(p.images[0])} alt="" className="h-full w-full object-cover" /> : null}

                </div>

                <div className="flex-1 min-w-0 space-y-1.5">

                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>

                  <p className="text-xs text-gray-500">List: {formatPrice(p.price, p.priceMax)} / unit</p>

                  <label className="block text-[11px] font-semibold text-primary-800">Favored price / unit</label>

                  <input

                    type="number"

                    min={0}

                    step="any"

                    inputMode="decimal"

                    placeholder="Optional"

                    value={offers[p.id] ?? ''}

                    onChange={(e) => setOffers((o) => ({ ...o, [p.id]: e.target.value }))}

                    className="w-full rounded-lg border-2 border-primary-100 bg-primary-50/50 px-3 py-2 text-sm font-medium"

                  />

                </div>

              </div>

            ))}

          </div>

        </div>



        <div>

          <p className="text-sm font-bold text-gray-900 mb-2">Add a note (optional)</p>

          <textarea

            value={note}

            onChange={(e) => setNote(e.target.value)}

            placeholder="e.g. Good quality, check this lot"

            rows={2}

            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base min-h-[56px] focus:border-primary-500 focus:outline-none resize-none"

          />

        </div>



        <div>

          <p className="text-sm font-bold text-gray-900 mb-2">Order workflow</p>

          <div className="flex gap-2">

            {(['DIRECT', 'MANAGED'] as const).map((mode) => (

              <button

                key={mode}

                type="button"

                onClick={() => setOrderMode(mode)}

                className={`flex-1 rounded-xl border-2 py-3 px-2 text-center min-h-[48px] ${

                  orderMode === mode ? 'border-primary-600 bg-primary-50' : 'border-gray-200'

                }`}

              >

                <p className={`text-sm font-semibold ${orderMode === mode ? 'text-primary-700' : 'text-gray-500'}`}>

                  {mode === 'DIRECT' ? 'Direct' : 'Managed'}

                </p>

                <p className={`text-[10px] mt-0.5 ${orderMode === mode ? 'text-primary-500' : 'text-gray-400'}`}>

                  {mode === 'DIRECT' ? 'Customer → Vendor (you observe)' : 'Customer → You → Vendor'}

                </p>

              </button>

            ))}

          </div>

          <p className="mt-1.5 text-xs text-gray-400">You are always in the loop regardless of the mode.</p>

        </div>

      </div>



      <div className="fixed bottom-0 inset-x-0 z-30 bg-white px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom,0px))] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">

        <div className="mx-auto max-w-4xl flex gap-2 items-stretch">

          <button

            type="button"

            onClick={() => void submitShare(false)}

            disabled={!hasRecipients || shareMutation.isPending}

            className="min-h-[56px] flex-1 rounded-xl bg-primary-600 px-4 py-3 text-base font-bold text-white leading-tight active:bg-primary-700 disabled:opacity-50"

          >

            {shareMutation.isPending ? 'Sharing...' : `Share (${approxRecipientHint})`}

          </button>

          <button

            type="button"

            onClick={() => void submitShare(true)}

            disabled={!hasRecipients || shareMutation.isPending}

            title="Share and open WhatsApp"

            aria-label="Share and open WhatsApp"

            className="flex shrink-0 min-h-[56px] w-[52px] items-center justify-center rounded-xl border-2 border-gray-200 bg-white active:bg-gray-50 disabled:opacity-40"

          >

            <svg viewBox="0 0 24 24" fill="#25D366" className="h-7 w-7" aria-hidden>

              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />

              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.108-1.138l-.292-.174-3.064.91.91-3.064-.174-.292A7.96 7.96 0 014 12a8 8 0 1116 0 8 8 0 01-8 8z" />

            </svg>

          </button>

        </div>

      </div>

    </>

  );

}

