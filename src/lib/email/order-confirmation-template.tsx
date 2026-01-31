import { RequestDataForEmail } from "@/types";

export function generateOrderConfirmationHTML(data: RequestDataForEmail): string {
  const { guestId, fullname, address, whatsappNumber, postalCode, totalPurchased, totalItemsSold, isMember, paymentMethod, items, baseUrl, createdAt } = data;

  const formattedDate = new Date(createdAt).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedPaymentMethod = paymentMethod.replace("_", " ").toUpperCase();

  const itemsHTML =
    items && items.length > 0
      ? items
          .map(
            (item, index) => `
        <div style="border-bottom: ${index < items.length - 1 ? "1px solid #eee" : "none"}; padding: 10px 0;">
          <p style="margin: 5px 0; font-weight: bold;">${item.product.name}</p>
          <p style="margin: 5px 0; font-size: 14px; color: #666;">
            Size: ${item.selectedSize} | Quantity: ${item.quantity}
          </p>
          <p style="margin: 5px 0; font-size: 14px;">
            Price: Rp ${(item.product.price * item.quantity).toLocaleString("id-ID")}
          </p>
        </div>
      `
          )
          .join("")
      : "<p>No items in the cart.</p>";

  const membershipHTML = isMember
    ? `
      <div style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 5px; font-weight: bold; margin-bottom: 10px;">
        ✅ You are a Member - Enjoy Your Benefits!
      </div>
      <p style="font-size: 14px; color: #666; margin: 10px 0;">
        As a member, you enjoy exclusive discounts on products.
      </p>
    `
    : `
      <a href="${baseUrl}/order/payment/success/${guestId}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-bottom: 10px;">
        🌟 Join Our Membership
      </a>
      <p style="font-size: 14px; color: #666; margin: 10px 0;">
        Become a member to get exclusive discounts!
      </p>
    `;

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Confirmation</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
        <h1 style="margin: 0 0 10px 0;">Order Confirmation</h1>
        <p style="margin: 0;">Thank you for your purchase!</p>
      </div>

      <!-- Content -->
      <div style="padding: 20px; background: #f9f9f9;">
        <h2 style="color: #333; margin-top: 0;">Hello, ${fullname}!</h2>
        <p>We've received your order and it's being processed. Here are the details:</p>

        <!-- Order Information -->
        <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0; color: #2563eb;">Order Information</h3>
          <p style="margin: 8px 0;">
            <strong>Order ID:</strong> ${guestId}
          </p>
          <p style="margin: 8px 0;">
            <strong>Date:</strong> ${formattedDate}
          </p>
          <p style="margin: 8px 0;">
            <strong>Payment Method:</strong> ${formattedPaymentMethod}
          </p>
        </div>

        <!-- Shipping Information -->
        <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0; color: #2563eb;">Shipping Information</h3>
          <p style="margin: 8px 0;">
            <strong>Name:</strong> ${fullname}
          </p>
          <p style="margin: 8px 0;">
            <strong>Address:</strong> ${address}
          </p>
          <p style="margin: 8px 0;">
            <strong>Postal Code:</strong> ${postalCode}
          </p>
          <p style="margin: 8px 0;">
            <strong>WhatsApp:</strong> ${whatsappNumber}
          </p>
        </div>

        <!-- Order Items -->
        <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0; color: #2563eb;">Order Items</h3>
          
          ${itemsHTML}

          <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #2563eb;">
            <p style="font-weight: bold; font-size: 16px; margin: 5px 0;">
              Total Items: ${totalItemsSold}
            </p>
            <p style="font-weight: bold; font-size: 18px; color: #2563eb; margin: 5px 0;">
              Total Amount: Rp ${totalPurchased.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <p>We'll send you another email once your order ships. If you have any questions, please don't hesitate to contact us.</p>

        <!-- Membership Section -->
        <div style="text-align: center; margin: 20px 0;">
          ${membershipHTML}
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 20px; color: #666; background: #f9f9f9; border-radius: 0 0 5px 5px;">
        <p style="margin: 5px 0;">Thank you for shopping with us!</p>
        <p style="margin: 5px 0;">&copy; 2025 Lindway. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}
