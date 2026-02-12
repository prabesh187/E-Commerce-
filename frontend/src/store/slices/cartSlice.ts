import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Cart, CartItem } from '../../types';

interface CartState {
  items: CartItem[];
  totalAmount: number;
}

const initialState: CartState = {
  items: [],
  totalAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action: PayloadAction<Cart>) => {
      state.items = action.payload.items;
      state.totalAmount = action.payload.totalAmount;
    },
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(item => item.product._id === action.payload.product._id);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      state.totalAmount = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
    },
  },
});

export const { setCart, addItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
