import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import {createServerClient} from '@supabase/ssr'

import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../utils/server/supabase';

// export async function createClient() {
//   const cookieStore = await cookies()

//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return cookieStore.getAll()
//         },
//         setAll(cookiesToSet) {
//           try {
//             cookiesToSet.forEach(({ name, value, options }) =>
//               cookieStore.set(name, value, options)
//             )
//           } catch {
//             // The `setAll` method was called from a Server Component.
//             // This can be ignored if you have middleware refreshing
//             // user sessions.
//           }
//         },
//       },
//     }
//   )
// }

export async function fetchRevenue(supabase: SupabaseClient) {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await supabase.from("revenue").select<"*", Revenue>();

    console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices(supabase: SupabaseClient) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  try {
    const {data: latestInvoiceRaw} = await supabase.from("invoices").select<string, LatestInvoiceRaw>(`amount, customers(name, image_url, email) id`).order("date", {ascending: false}).limit(5)

    const latestInvoices = latestInvoiceRaw!.map((invoice) => ({
      email: invoice.customers.email,
      name: invoice.customers.name,
      image_url: invoice.customers.image_url,
      amount: formatCurrency(invoice.amount),
      id: invoice.id
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData(supabase: SupabaseClient) {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = supabase.from("invoices").select("*", {count: "exact"})
    const customerCountPromise = supabase.from("customers").select('*', {count: 'exact'})
    const invoiceStatusPromise = supabase.rpc('sum_amount_by_status')
    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);
    console.log(data[2].data)

    const numberOfInvoices = Number(data[0].count ?? '0');
    const numberOfCustomers = Number(data[1].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].data[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].data[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const supabase = await createClient()
  try {
    const {data, error} = await supabase.rpc('invoices_get_filtered', {
      offset_amount: offset,
      query: `%${query}%`,
      items_per_page: ITEMS_PER_PAGE
    })
    console.log(data)
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
  // try {
  //   const invoices = await sql<InvoicesTable>`
  //     SELECT
  //       invoices.id,
  //       invoices.amount,
  //       invoices.date,
  //       invoices.status,
  //       customers.name,
  //       customers.email,
  //       customers.image_url
  //     FROM invoices
  //     JOIN customers ON invoices.customer_id = customers.id
  //     WHERE
  //       customers.name ILIKE ${`%${query}%`} OR
  //       customers.email ILIKE ${`%${query}%`} OR
  //       invoices.amount::text ILIKE ${`%${query}%`} OR
  //       invoices.date::text ILIKE ${`%${query}%`} OR
  //       invoices.status ILIKE ${`%${query}%`}
  //     ORDER BY invoices.date DESC
  //     LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
  //   `;

  //   return invoices.rows;
  // } catch (error) {
  //   console.error('Database Error:', error);
  //   throw new Error('Failed to fetch invoices.');
  // }
}

export async function fetchInvoicesPages(query: string) {
  const supabase = await createClient()
  try {
    
      const {data, error} = await supabase.rpc('invoices_get_pages', {
        query: `%${query}%`
      })
      console.log(data)
      const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
      console.log("total pages", totalPages)
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const supabase = await createClient()
    const {data} = await supabase.from('invoices').select('id, customer_id, amount, status').eq('id', id)
    

    const invoice = data?.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice ? invoice[0]: null;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const supabase = await createClient();
    const {data} = await supabase.from("customers").select<"id, name", CustomerField>("id, name").order("name", {ascending: true})
    console.log(data)

    const customers = data!;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
