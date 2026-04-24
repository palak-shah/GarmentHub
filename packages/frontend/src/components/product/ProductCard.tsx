import { Link } from 'react-router-dom';
import { formatPrice } from '@/utils/formatters';
import { mediaUrl } from '@/utils/mediaUrl';
import type { Product } from '@/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-gray-100">
        {(product.images ?? [])[0] ? (
          <img
            src={mediaUrl(product.images[0])}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">No image</div>
        )}
      </div>
      {(product.images ?? []).length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-t border-gray-100 bg-gray-50/80 px-1.5 py-1.5">
          {(product.images ?? []).slice(1).map((url, i) => (
            <img
              key={`${product.id}-extra-${i}`}
              src={mediaUrl(url)}
              alt=""
              className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-gray-200/80"
              loading="lazy"
            />
          ))}
        </div>
      )}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          {product.brand?.name && <span className="font-medium text-gray-600">{product.brand.name}</span>}
          {product.brand?.name && product.vendor?.name && <span> &middot; </span>}
          {product.vendor?.businessName || product.vendor?.name}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-primary-600">{formatPrice(product.price)}</span>
          <span className="text-xs text-gray-400">MOQ: {product.moq}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {product.fabric && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{product.fabric}</span>
          )}
          {product.pattern && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{product.pattern}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
