import { Ticket, TicketCategory } from '../types/support';

// Simulated in-memory database
let tickets: Ticket[] = [];

export async function fetchTickets(): Promise<Ticket[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [...tickets].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createTicket(
  category: TicketCategory,
  description: string,
  phone?: string,
  _file?: File // Simulated file upload
): Promise<Ticket> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const newTicket: Ticket = {
    id: `TK-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    category,
    description,
    phone,
    status: 'OPEN',
    createdAt: new Date(),
    updatedAt: new Date(),
    // In a real app we would upload the file and get an URL back.
    attachmentUrl: _file ? URL.createObjectURL(_file) : undefined,
  };

  tickets = [...tickets, newTicket];
  return newTicket;
}
