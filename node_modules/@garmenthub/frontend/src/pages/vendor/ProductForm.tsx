import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productApi } from '@/api/product.api';
import { brandApi } from '@/api/brand.api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '', brandId: '', categoryId: '', pattern: '', fabric: '', color: '',
    price: '', moq: '1', status: 'ACTIVE' as 'ACTIVE' | 'DRAFT',
    images: '' as string,
  });

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getById(id!),
    enabled: isEdit,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.getCategories(),
  });

  const { data: brands } = useQuery({
    queryKey: ['vendor-brands'],
    queryFn: () => brandApi.listMy(),
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        brandId: product.brandId,
        categoryId: product.categoryId,
        pattern: product.pattern || '',
        fabric: product.fabric || '',
        color: product.color || '',
        price: product.price?.toString() || '',
        moq: product.moq.toString(),
        status: product.status === 'ARCHIVED' ? 'DRAFT' : product.status,
        images: product.images.join('\n'),
      });
    }
  }, [product]);

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => productApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success('Product created');
      navigate('/vendor/products');
    },
    onError: () => toast.error('Failed to create product'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => productApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success('Product updated');
      navigate('/vendor/products');
    },
    onError: () => toast.error('Failed to update product'),
  });

  const handleSubmit = () => {
    if (!form.name || !form.brandId || !form.categoryId) {
      toast.error('Name, brand, and category are required');
      return;
    }
    const payload = {
      name: form.name,
      brandId: form.brandId,
      categoryId: form.categoryId,
      pattern: form.pattern,
      fabric: form.fabric,
      color: form.color,
      price: form.price ? parseFloat(form.price) : undefined,
      moq: parseInt(form.moq) || 1,
      status: form.status,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  if (isEdit && loadingProduct) return <PageSpinner />;

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <>
      <Header title={isEdit ? 'Edit Product' : 'Add Product'} showBack />
      <div className="mx-auto max-w-4xl px-4 py-4 space-y-4">
        <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Brand</label>
          <select
            value={form.brandId}
            onChange={(e) => setForm({ ...form, brandId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select brand</option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {brands && brands.length === 0 && (
            <p className="text-xs text-amber-600">No brands yet. Create one in the Brands section first.</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Fabric" value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })} placeholder="e.g. Cotton" />
          <Input label="Pattern" value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} placeholder="e.g. Solid" />
          <Input label="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. White" />
          <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Optional" />
          <Input label="MOQ" type="number" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'DRAFT' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Image URLs (one per line)</label>
          <textarea
            value={form.images}
            onChange={(e) => setForm({ ...form, images: e.target.value })}
            rows={3}
            placeholder="https://example.com/image1.jpg"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <Button className="w-full" size="lg" onClick={handleSubmit} loading={isPending}>
          {isEdit ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </>
  );
}
