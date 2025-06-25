"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useProductsInfinite, flattenProductsPages, getTotalProductsCount, type Product, type ProductsFilters } from '@/hooks/queries/admin/useProducts';
import { useDeleteProduct } from '@/hooks/mutations/admin/useProductMutations';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  MoreHorizontal, 
  Search, 
  SlidersHorizontal,
  PlusCircle,
  ImageIcon,
  ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductForm } from "@/components/products/product-form";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import Image from "next/image";

// Constants
const ITEM_HEIGHT = 80;
const HEADER_HEIGHT = 56;
const DEFAULT_PAGE_SIZE = 50;

// Loading skeleton for items
function ProductRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-3 border-b space-x-4">
      <Skeleton className="h-10 w-10 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-8" />
    </div>
  );
}

// Product row component
interface ProductRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    products: Product[];
    isLoading: boolean;
    hasNextPage: boolean;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
  };
}

function ProductRow({ index, style, data }: ProductRowProps) {
  const { products, isLoading, hasNextPage, onEdit, onDelete } = data;
  const product = products[index];

  // Show loading skeleton for items that haven't loaded yet
  if (!product && (isLoading || hasNextPage)) {
    return (
      <div style={style}>
        <ProductRowSkeleton />
      </div>
    );
  }

  if (!product) {
    return <div style={style} />;
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <div style={style} className="flex items-center px-4 py-3 border-b hover:bg-muted/50">
      {/* Product Image */}
      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted overflow-hidden mr-4">
        {product.image_url ? (
          <Image 
            src={product.image_url}
            alt={product.name || "Product image"}
            width={40} 
            height={40} 
            className="object-contain"
          />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Product Name */}
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2">
          <Link 
            href={`/products/${product.id}`} 
            className="font-medium hover:underline text-sm truncate"
          >
            {product.name}
          </Link>
          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {product.description || "No description"}
        </p>
      </div>

      {/* Status */}
      <div className="w-20 mr-4">
        <Badge variant={product.is_active !== false ? "default" : "secondary"} className="text-xs">
          {product.is_active !== false ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Created Date */}
      <div className="w-24 text-xs text-muted-foreground mr-4">
        {formatDate(product.created_at)}
      </div>

      {/* Updated Date */}
      <div className="w-24 text-xs text-muted-foreground mr-4">
        {formatDate(product.updated_at)}
      </div>

      {/* Actions */}
      <div className="w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/products/${product.id}`} className="flex w-full">
                View details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(product)}>
              Edit product
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 hover:!text-red-600 focus:!text-red-600"
              onClick={() => onDelete(product)}
            >
              Delete product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Table header component
function TableHeaderRow() {
  return (
    <div className="flex items-center px-4 py-3 bg-muted/30 border-b font-medium text-sm">
      <div className="w-10 mr-4">Image</div>
      <div className="flex-1 mr-4">Name</div>
      <div className="w-20 mr-4">Status</div>
      <div className="w-24 mr-4">Created</div>
      <div className="w-24 mr-4">Updated</div>
      <div className="w-8"></div>
    </div>
  );
}

// Main component props
interface VirtualizedProductsTableProps {
  isAdmin: boolean;
}

export function VirtualizedProductsTable({ isAdmin }: VirtualizedProductsTableProps) {
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>(undefined);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Query filters
  const filters: ProductsFilters = {
    search: debouncedSearchTerm,
    pageSize: DEFAULT_PAGE_SIZE,
  };
  
  // Infinite query
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useProductsInfinite(filters);
  
  // Mutations
  const deleteProductMutation = useDeleteProduct();
  
  // Data processing
  const products = flattenProductsPages(data);
  const totalCount = getTotalProductsCount(data);
  const isLoading = status === 'pending';
  
  // Refs
  const listRef = useRef<List>(null);
  
  // Calculate table height (viewport height - header - padding)
  const tableHeight = Math.min(600, Math.max(400, products.length * ITEM_HEIGHT + HEADER_HEIGHT));
  
  // Infinite loader helpers
  const isItemLoaded = useCallback((index: number) => {
    return !!products[index];
  }, [products]);
  
  const loadMoreItems = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Item count for infinite loader
  const itemCount = hasNextPage ? products.length + 1 : products.length;
  
  // Handlers
  const handleCreateProduct = () => {
    setEditProduct(undefined);
    setShowProductForm(true);
  };
  
  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setShowProductForm(true);
  };
  
  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };
  
  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      await deleteProductMutation.mutateAsync(productToDelete.id);
      setProductToDelete(null);
    }
  };
  
  const handleProductUpdated = () => {
    setShowProductForm(false);
    setEditProduct(undefined);
  };
  
  // Reset scroll when search changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, 'start');
    }
  }, [debouncedSearchTerm]);
  
  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-destructive">Error loading products: {error.message}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()} 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <Card>
      {/* Header with search and actions */}
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button onClick={handleCreateProduct}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            )}
          </div>
        </div>
        
        {/* Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>
              {isLoading 
                ? "Loading products..." 
                : `${totalCount} product${totalCount !== 1 ? 's' : ''} found`
              }
            </span>
          </div>
          {isFetching && (
            <div className="text-xs text-muted-foreground">Updating...</div>
          )}
        </div>
      </div>
      
      {/* Virtualized Table */}
      <div className="border-t">
        <TableHeaderRow />
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductRowSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm 
                ? `No products match "${searchTerm}". Try adjusting your search.`
                : "Get started by creating your first product."
              }
            </p>
            {isAdmin && !searchTerm && (
              <Button onClick={handleCreateProduct}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Product
              </Button>
            )}
          </div>
        ) : (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMoreItems}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={(list) => {
                  listRef.current = list;
                  ref(list);
                }}
                height={tableHeight}
                width="100%"
                itemCount={itemCount}
                itemSize={ITEM_HEIGHT}
                onItemsRendered={onItemsRendered}
                itemData={{
                  products,
                  isLoading,
                  hasNextPage,
                  onEdit: handleEditProduct,
                  onDelete: handleDeleteProduct,
                }}
              >
                {ProductRow}
              </List>
            )}
          </InfiniteLoader>
        )}
        
        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading more products...
          </div>
        )}
      </div>
      
      {/* Edit Product Dialog/Form */}
      {showProductForm && (
        <ProductForm
          open={showProductForm}
          onOpenChange={(open) => {
            setShowProductForm(open);
            if (!open) {
              handleProductUpdated();
            }
          }}
          product={editProduct as any}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product "{productToDelete?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProductMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteProductMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 