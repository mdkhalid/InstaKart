import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: any[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <div key={product.id} className="min-w-0">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
