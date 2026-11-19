"use client";

import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/providers/CustomerAuth";
import { useCart } from "@/components/providers/CartProvider";
import { Img } from "@/components/store/Img";
import { OrderSummary } from "@/components/store/OrderSummary";
import { RequireAuth } from "@/components/store/RequireAuth";
import { Alert, Button, ButtonLink, Field, Input, PageSpinner } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { money } from "@/lib/format";
import type { OrderDetail } from "@/lib/types";
import { clean, isValid, required, type Errors } from "@/lib/validation";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const emptyAddress = { name: "", phone: "", address_line1: "", address_line2: "", city: "", state: "", postal_code: "", country: "BD" };

interface PendingOrder {
  order_number: string;
  client_secret: string;
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { user } = useAuth();
  const { cart, refresh } = useCart();
  const [address, setAddress] = useState({ ...emptyAddress, name: user?.name ?? "", phone: user?.phone ?? "" });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [cardError, setCardError] = useState("");
  const [busy, setBusy] = useState(false);
  // After a declined card the same order is kept, so a retry does not create a second order.
  const [pending, setPending] = useState<PendingOrder | null>(null);

  const set = (key: keyof typeof address) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress({ ...address, [key]: event.target.value });
    setPending(null); // the address changed, so the next payment needs a fresh order
  };

  const validate = () =>
    clean({
      name: required(address.name, "Name", 2),
      phone: !/^[0-9+\-\s()]{6,30}$/.test(address.phone) ? "Enter a valid phone number." : undefined,
      address_line1: required(address.address_line1, "Address"),
      city: required(address.city, "City"),
      postal_code: required(address.postal_code, "Postal code"),
      country: !/^[A-Za-z]{2}$/.test(address.country) ? "Use a 2-letter country code (for example BD)." : undefined,
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const found = validate();
    setErrors(found);
    setServerError("");
    setCardError("");
    if (!isValid(found)) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    setBusy(true);
    try {
      // 1. The server prices the cart itself and creates a pending order + Stripe payment intent.
      let order = pending;
      if (!order) {
        const res = await api<{ order_number: string; client_secret: string }>("/checkout", {
          method: "POST",
          scope: "customer",
          body: { ...address, address_line2: address.address_line2 || undefined, state: address.state || undefined },
        });
        order = { order_number: res.data.order_number, client_secret: res.data.client_secret };
        setPending(order);
      }

      // 2. The card goes straight from the browser to Stripe. We never see the card number.
      const result = await stripe.confirmCardPayment(order.client_secret, {
        payment_method: { card, billing_details: { name: address.name } },
      });
      if (result.error) {
        setCardError(result.error.message ?? "The payment failed. Please try another card.");
        return;
      }

      // 3. The server asks Stripe for the real result before marking the order paid.
      const confirmed = await api<OrderDetail>("/checkout/confirm", {
        method: "POST",
        scope: "customer",
        body: { order_number: order.order_number },
      });
      await refresh();
      router.replace(`/account/orders/${confirmed.data.order_number}?placed=1`);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(e.errors).filter(([k]) => k in emptyAddress).map(([k, v]) => [k, v[0]])));
        const extra = (["cart", "coupon"] as const).flatMap((key) => e.errors[key] ?? []);
        setServerError(extra.length ? extra.join(" ") : e.message);
        setPending(null);
        await refresh().catch(() => undefined); // stock or coupon may have changed
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!cart) return <PageSpinner />;

  if (cart.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="display text-4xl">Nothing to check out</h1>
        <ButtonLink href="/products" size="lg" className="mt-8">
          Continue shopping
        </ButtonLink>
      </div>
    );
  }

  const field = (key: keyof typeof address, label: string, extra: React.ComponentProps<typeof Input> = {}, optional = false) => (
    <Field label={optional ? `${label} (optional)` : label} htmlFor={key} error={errors[key]}>
      <Input id={key} value={address[key]} onChange={set(key)} invalid={!!errors[key]} maxLength={255} {...extra} />
    </Field>
  );

  return (
    <form onSubmit={submit} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_28rem]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-black/10 p-5 sm:p-6">
          <h2 className="mb-5 text-2xl font-bold">Shipping address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("name", "Full name", { autoComplete: "name" })}
            {field("phone", "Phone", { type: "tel", autoComplete: "tel" })}
            <div className="sm:col-span-2">{field("address_line1", "Address", { autoComplete: "address-line1" })}</div>
            <div className="sm:col-span-2">{field("address_line2", "Apartment, suite, etc.", { autoComplete: "address-line2" }, true)}</div>
            {field("city", "City", { autoComplete: "address-level2" })}
            {field("state", "State / Division", { autoComplete: "address-level1" }, true)}
            {field("postal_code", "Postal code", { autoComplete: "postal-code" })}
            {field("country", "Country (2 letters)", { autoComplete: "country", maxLength: 2 })}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 p-5 sm:p-6">
          <h2 className="mb-1 text-2xl font-bold">Payment</h2>
          <p className="mb-4 text-sm text-black/60">
            Test mode: use card <strong>4242 4242 4242 4242</strong>, any future date and any CVC.
          </p>
          <div className="stripe-field">
            <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: "16px", color: "#000" } } }} />
          </div>
          {cardError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {cardError}
            </p>
          )}
        </section>
      </div>

      <aside className="h-fit space-y-5 rounded-3xl border border-black/10 p-5 sm:p-6" aria-label="Order summary">
        <h2 className="text-2xl font-bold">Order summary</h2>
        <ul className="divide-y divide-black/10">
          {cart.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface">
                <Img src={item.product?.image} alt="" sizes="56px" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{item.product?.name}</p>
                <p className="text-black/60">
                  {[item.size, item.color].filter(Boolean).join(" · ")}
                  {item.size || item.color ? " · " : ""}Qty {item.quantity}
                </p>
              </div>
              <span className="text-sm font-bold">{money(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <OrderSummary cart={cart} />
        {serverError && <Alert>{serverError}</Alert>}
        <Button type="submit" size="lg" loading={busy} disabled={!stripe} className="w-full">
          Pay {money(cart.total)}
        </Button>
        <p className="text-center text-xs text-black/50">
          Totals are calculated securely on our server.{" "}
          <Link href="/cart" className="underline">
            Edit cart
          </Link>
        </p>
      </aside>
    </form>
  );
}

export default function CheckoutPage() {
  const options = useMemo(() => ({}), []);

  return (
    <RequireAuth>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <h1 className="display text-4xl sm:text-5xl">Checkout</h1>
        {stripePromise ? (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm />
          </Elements>
        ) : (
          <div className="mt-6">
            <Alert>
              Stripe is not configured. Add your test publishable key as <code>NEXT_PUBLIC_STRIPE_KEY</code> in <code>frontend/.env.local</code> and restart the dev server.
            </Alert>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
