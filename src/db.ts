import { OrderPaymentStatus } from "./server";

const createDB = () => {
    let storedOrders: OrderPaymentStatus[] = [];
  
    return {
      orderPayments: {
        insert: (data: OrderPaymentStatus): void => {
          storedOrders.push(data);
        },
        update: (
          orderId: string,
          data: Partial<Omit<OrderPaymentStatus, 'orderId'>>
        ): void => {
          storedOrders = storedOrders.map(oldOrder => {
            if (oldOrder.orderId === orderId) {
              return { ...oldOrder, ...data };
            }
            return oldOrder;
          });
        },
        findOneByOrderId: (orderId: string): OrderPaymentStatus | undefined => {
          return storedOrders.find(data => data.orderId === orderId);
        }
      }
    };
  };
export const db = createDB();
 