"use strict";Object.defineProperty(exports, "__esModule", {value: true});

const createDB = () => {
    let storedOrders = [];
  
    return {
      orderPayments: {
        insert: (data) => {
          storedOrders.push(data);
        },
        update: (
          orderId,
          data
        ) => {
          storedOrders = storedOrders.map(oldOrder => {
            if (oldOrder.orderId === orderId) {
              return { ...oldOrder, ...data };
            }
            return oldOrder;
          });
        },
        findOneByOrderId: (orderId) => {
          return storedOrders.find(data => data.orderId === orderId);
        }
      }
    };
  };
 const db = createDB(); exports.db = db;
 