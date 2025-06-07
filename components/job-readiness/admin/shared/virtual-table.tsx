"use client"

import * as React from "react"
import { FixedSizeList as List } from "react-window"
import InfiniteLoader from "react-window-infinite-loader"
import { cn } from "@/lib/utils"

interface VirtualTableProps {
  items: any[]
  itemHeight: number
  renderRow: (index: number, style: React.CSSProperties, item: any) => React.ReactNode
  isLoading?: boolean
  hasNextPage?: boolean
  loadMoreItems?: () => Promise<void>
  className?: string
  height?: number
}

export function VirtualTable({
  items,
  itemHeight,
  renderRow,
  isLoading = false,
  hasNextPage = false,
  loadMoreItems,
  className,
  height = 600,
}: VirtualTableProps) {
  const listRef = React.useRef<List>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState(800)
  
  // Measure container width for react-window
  React.useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setContainerWidth(entries[0].contentRect.width)
        }
      })
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }
  }, [])
  
  // Determine if virtual scrolling should be enabled
  // Only enable for large datasets (100+ items) to avoid unnecessary complexity
  const shouldUseVirtualScrolling = items.length > 100
  
  // For infinite loading
  const itemCount = hasNextPage ? items.length + 1 : items.length
  const isItemLoaded = (index: number) => !!items[index]
  
  // Row renderer for react-window
  const Row = React.memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index]
    
    // Loading row
    if (!item) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
        </div>
      )
    }
    
    return renderRow(index, style, item)
  })
  
  Row.displayName = 'VirtualTableRow'
  
  // If dataset is small, render normally without virtualization
  if (!shouldUseVirtualScrolling) {
    return (
      <div ref={containerRef} className={cn("space-y-1", className)}>
        {items.map((item, index) => (
          <div key={item.id || index}>
            {renderRow(index, {}, item)}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
      </div>
    )
  }
  
  // Virtual scrolling for large datasets
  if (loadMoreItems && hasNextPage) {
    // With infinite loading
    return (
      <div ref={containerRef} className={cn("border rounded-lg", className)}>
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={loadMoreItems}
        >
          {({ onItemsRendered, ref }: any) => (
            <List
              ref={(list: any) => {
                listRef.current = list
                ref(list)
              }}
              height={height}
              width={containerWidth}
              itemCount={itemCount}
              itemSize={itemHeight}
              onItemsRendered={onItemsRendered}
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {Row}
            </List>
          )}
        </InfiniteLoader>
      </div>
    )
  }
  
  // Virtual scrolling without infinite loading
  return (
    <div ref={containerRef} className={cn("border rounded-lg", className)}>
      <List
        ref={listRef}
        height={height}
        width={containerWidth}
        itemCount={items.length}
        itemSize={itemHeight}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {Row}
      </List>
    </div>
  )
} 