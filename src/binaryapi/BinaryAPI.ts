import {
    HistoryRequest,
    TGetQuotes,
    TgetTicksHistory,
    TgetTicksHistoryResult,
    TGranularity,
    TRequestForget,
    TRequestForgetStream,
    TResponseAPICallback,
} from 'src/types';

type HistoryRequestPartial = Omit<HistoryRequest, 'count'> & {
    count?: number;
};

export type TCreateHistoryParams = HistoryRequestPartial & { symbol: string };
export default class BinaryAPI {
    requestForget: TRequestForget;
    requestForgetStream?: TRequestForgetStream;
    _getTicksHistory: TgetTicksHistory;
    _getQuotes: TGetQuotes;
    static get DEFAULT_COUNT() {
        return 1000;
    }
    streamRequests: Record<string, { request: HistoryRequest; callback: TResponseAPICallback }> = {};


    constructor(
        requestForget: TRequestForget,
        getTicksHistory: TgetTicksHistory,
        getQuotes: TGetQuotes,
        requestForgetStream?: TRequestForgetStream
    ) {
        this.requestForget = requestForget;
        this.requestForgetStream = requestForgetStream;
        this._getTicksHistory = getTicksHistory;
        this._getQuotes = getQuotes;
    }
    /**
     * Get tick history for a symbol
     * @param params Parameters for the tick history request
     * @returns A Promise that resolves to a TgetTicksHistoryResult
     */
    async getTicksHistory(params: TCreateHistoryParams): Promise<TgetTicksHistoryResult> {
        if (this._getTicksHistory) {
            const quotes = await this._getTicksHistory({
                symbol: params.symbol,
                granularity: params.granularity as number,
                count:
                    typeof params.count === 'string'
                        ? parseInt(params.count, 10)
                        : params.count || BinaryAPI.DEFAULT_COUNT,
                start: typeof params.start === 'string' ? parseInt(params.start, 10) : params.start,
                end: typeof params.end === 'string' ? parseInt(params.end, 10) : params.end,
            });

            if (params.granularity) {
                return {
                    candles: quotes.candles,
                };
            }

            // For ticks style
            if (quotes.history && quotes.history.times && quotes.history.prices) {
                const times = quotes.history.times;
                const prices = quotes.history.prices;
                return {
                    history: {
                        times,
                        prices,
                    },
                };
            }

            // If neither candles nor history is available, throw an error
            throw new Error('Invalid tick history response format');
        }

        // If no custom getTicksHistory function is provided, return a default empty response
        throw new Error('No getTicksHistory function provided');
    }
    subscribeTickHistory(params: TCreateHistoryParams, callback: TResponseAPICallback) {
        const key = this._getKey(params);
        const request = BinaryAPI.createTickHistoryRequest({ ...params, subscribe: 1 });
        this.streamRequests[key] = { request, callback };

        // Send a copy of the request, in case it gets mutated outside
        this._getQuotes({ symbol: params.symbol, granularity: params.granularity }, callback);
    }
    forget(params: { symbol: string; granularity: TGranularity }) {
        const key = this._getKey(params as TCreateHistoryParams);
        if (!this.streamRequests[key]) return;
        const { request, callback } = this.streamRequests[key];
        delete this.streamRequests[key];
        return this.requestForget(request, callback);
    }
    forgetStream(subscription_id: string) {
        if (this.requestForgetStream && typeof this.requestForgetStream === 'function') {
            return this.requestForgetStream(subscription_id);
        }
    }
    static createTickHistoryRequest({
        symbol,
        granularity,
        start,
        end,
        subscribe,
        adjust_start_time = 1,
        count,
    }: TCreateHistoryParams): HistoryRequest {
        const request: HistoryRequest = {
            symbol,
            style: granularity ? 'candles' : 'ticks',
            start,
            end,
            count: count || BinaryAPI.DEFAULT_COUNT,
        };
        if (granularity) {
            // granularity will only be set if style=candles
            request.granularity = +granularity as HistoryRequest['granularity'];
        }
        if (adjust_start_time) {
            request.adjust_start_time = adjust_start_time;
        }
        if (subscribe) {
            request.subscribe = 1;
        }
        if (start) {
            delete request.count;
            request.start = start;
        }
        if (end) {
            request.end = end;
        }
        return request;
    }
    _getKey({ symbol, granularity }: TCreateHistoryParams) {
        return `${symbol}-${granularity}`;
    }
}
