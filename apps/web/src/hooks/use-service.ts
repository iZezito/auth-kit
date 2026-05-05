import { useState, useCallback, useMemo, useRef } from "react";
import api from "@/services/api";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

type ID = string | number;

type RequestType = "get" | "getAll" | "create" | "update" | "remove" | "custom";

type IsPendingMap = Record<RequestType, boolean>;

interface ServiceHookResult<T> {
  data: T | null;
  list: T[] | null;
  error: Error | null;
  isPending: {
    global: boolean;
  } & IsPendingMap;
  get: (id?: ID, config?: AxiosRequestConfig<T>) => Promise<T>;
  getAll: (
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig<T[]>
  ) => Promise<T[]>;
  create: (data: Partial<T>, config?: AxiosRequestConfig<T>) => Promise<T>;
  update: (
    id: ID,
    data: Partial<T>,
    config?: AxiosRequestConfig<T>
  ) => Promise<T>;
  remove: (id: ID, config?: AxiosRequestConfig<void>) => Promise<void>;
  custom: <R = unknown, D = void>(
    config: StrictAxiosRequestConfig<R, D>
  ) => Promise<R>;
  mutate: (forceUpdate?: boolean) => void;
  refetch: () => Promise<void>;
}

export interface StrictAxiosRequestConfig<R, D = void>
  extends Omit<AxiosRequestConfig<D>, "transformResponse"> {
  transformResponse?: Array<(data: string) => R>;
}

export function useService<T extends { id: ID }>(
  resource: string
): ServiceHookResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [list, setList] = useState<T[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pendingRequests, setPendingRequests] = useState<IsPendingMap>({
    get: false,
    getAll: false,
    create: false,
    update: false,
    remove: false,
    custom: false,
  });

  const stateRef = useRef({ data, list });
  stateRef.current = { data, list };

  const setLoading = useCallback((key: RequestType, value: boolean) => {
    setPendingRequests((prev) =>
      value !== prev[key] ? { ...prev, [key]: value } : prev
    );
  }, []);

  const handleRequest = useCallback(
    async <R>(
      key: RequestType,
      request: () => Promise<AxiosResponse<R>>,
      onSuccess?: (result: R) => void
    ): Promise<R> => {
      setLoading(key, true);
      setError(null);

      try {
        const response = await request();
        const result = response.data;
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Erro inesperado na requisição");
        setError(error);
        throw error;
      } finally {
        setLoading(key, false);
      }
    },
    [setLoading]
  );

  const get = useCallback(
    (id?: ID, config?: AxiosRequestConfig<T>) => {
      const endpoint = `${resource}${id ? `/${id}` : ""}`;
      return handleRequest<T>(
        "get",
        () => api.get<T>(endpoint, config),
        (result) => setData(result)
      );
    },
    [resource, handleRequest]
  );

  const getAll = useCallback(
    (params?: Record<string, unknown>, config?: AxiosRequestConfig<T[]>) => {
      return handleRequest<T[]>(
        "getAll",
        () => api.get<T[]>(resource, { ...config, params }),
        (result) => setList(result)
      );
    },
    [resource, handleRequest]
  );

  const create = useCallback(
    (newData: Partial<T>, config?: AxiosRequestConfig<T>) => {
      return handleRequest<T>(
        "create",
        () => api.post<T>(resource, newData, config),
        (created) => {
          setData(created);
          setList((prev) => (prev ? [...prev, created] : [created]));
        }
      );
    },
    [resource, handleRequest]
  );

  const update = useCallback(
    (id: ID, updatedData: Partial<T>, config?: AxiosRequestConfig<T>) => {
      return handleRequest<T>(
        "update",
        () => api.put<T>(`${resource}/${id}`, updatedData, config),
        (updated) => {
          setData((prev) => (prev?.id === id ? { ...prev, ...updated } : prev));
          setList(
            (prev) =>
              prev?.map((item) =>
                item.id === id ? { ...item, ...updated } : item
              ) || null
          );
        }
      );
    },
    [resource, handleRequest]
  );

  const remove = useCallback(
    (id: ID, config?: AxiosRequestConfig<void>) => {
      return handleRequest<void>(
        "remove",
        () => api.delete(`${resource}/${id}`, config),
        () => {
          setData((prev) => (prev?.id === id ? null : prev));
          setList((prev) => prev?.filter((item) => item.id !== id) || null);
        }
      );
    },
    [resource, handleRequest]
  );

  const custom = useCallback(
    async <R, D = void>(config: StrictAxiosRequestConfig<R, D>): Promise<R> => {
      const transformResponse = config.transformResponse
        ? [
            ...(api.defaults.transformResponse as ((data: string) => R)[]),
            ...config.transformResponse,
          ]
        : api.defaults.transformResponse;

      return handleRequest<R>("custom", () =>
        api.request<R, AxiosResponse<R>, D>({
          ...config,
          transformResponse,
        })
      );
    },
    [handleRequest]
  );

  const mutate = useCallback((forceUpdate = false) => {
    if (forceUpdate) {
      setData(null);
      setList(null);
    }
  }, []);

  const refetch = useCallback(async () => {
    const { data, list } = stateRef.current;
    if (data?.id) await get(data.id);
    if (list) await getAll();
  }, [get, getAll]);

  const isPending = useMemo(
    () => ({
      ...pendingRequests,
      global: Object.values(pendingRequests).some(Boolean),
    }),
    [pendingRequests]
  );

  return useMemo(
    () => ({
      data,
      list,
      error,
      isPending,
      get,
      getAll,
      create,
      update,
      remove,
      custom,
      mutate,
      refetch,
    }),
    [
      data,
      list,
      error,
      isPending,
      get,
      getAll,
      create,
      update,
      remove,
      custom,
      mutate,
      refetch,
    ]
  );
}
