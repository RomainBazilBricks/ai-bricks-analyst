import {
    useMutation,
    useQuery,
    type QueryKey,
    type UseQueryOptions,
    type UseMutationOptions,
  } from "@tanstack/react-query";
  import { axiosGet, axiosPost, axiosPatch } from "@/api/axios";
  
  interface FetcherType<PARAMS = unknown, RESPONSE = unknown> {
    key: QueryKey | string;
    path: string;
    params?: PARAMS;
    options?: Partial<UseQueryOptions<RESPONSE, Error>>;
  }
  
  export const useFetcher = <PARAMS = unknown, RESPONSE = unknown>({
    key,
    path,
    params,
    options = {},
  }: FetcherType<PARAMS, RESPONSE>) => {
    return useQuery<RESPONSE, Error>({
      queryKey: Array.isArray(key) ? key : [key],
      queryFn: async (): Promise<RESPONSE> => {
        const returnedItem = await axiosGet<PARAMS, RESPONSE>(path, params);
        return returnedItem as any;
      },
      ...options,
    });
  };
  
  export const useMutator = <
    PARAMS = unknown,
    RESPONSE = unknown,
    ERROR = unknown
  >(
    path: string | ((data: PARAMS) => string),
    opts: Partial<UseMutationOptions<RESPONSE, ERROR, PARAMS>> & { method?: 'POST' | 'PATCH' } = {}
  ) => {
    const { method = 'POST', ...restOpts } = opts;
    
    const func = async (data: PARAMS): Promise<RESPONSE> => {
      const url = typeof path === 'function' ? path(data) : path;
      
      if (method === 'PATCH') {
        const returnedItem = await axiosPatch<PARAMS, RESPONSE>(url, data);
        return returnedItem as any;
      } else {
        const returnedItem = await axiosPost<PARAMS, RESPONSE>(url, data);
        return returnedItem as any;
      }
    };
  
    return useMutation<RESPONSE, ERROR, PARAMS>({
      ...restOpts,
      mutationFn: func,
    });
  };
  