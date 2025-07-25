// Admin query hooks
export { 
  useLearners, 
  useLearnersInfinite, 
  flattenLearnersPages, 
  getTotalLearnersCount,
  type Learner,
  type LearnersFilters
} from './useLearners';

export { 
  useUsers,
  useUsersInfinite,
  flattenUsersPages,
  getTotalUsersCount,
  type UserProfile,
  type UsersFilters
} from './useUsers';

export {
  useClients,
  useClientsInfinite,
  flattenClientsPages,
  getTotalClientsCount,
  type Client,
  type ClientsFilters
} from './useClients';

export {
  useModulesInfinite,
  flattenModulesPages,
  getTotalModulesCount,
  type Module,
  type ModulesFilters
} from './useModules';

export {
  useProductsInfinite,
  flattenProductsPages,
  getTotalProductsCount,
  type Product,
  type ProductsFilters
} from './useProducts';

export * from './useQuestionBanks';

// Shared types
export type { PaginatedResponse } from './useLearners';

// export * from './useClients'; 