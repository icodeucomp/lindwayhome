import { Background, Img, Motion } from "@/components";
import { Header } from "./header";

const contactUs = [
  { icons: "/location-light.svg", name: "Address", username: "Jalan Hayam Wuruk Gang XVII No. 36 Denpasar Timur, Bali 80239, Indonesia" },
  { icons: "/whatsapp-light.svg", name: "Lindway Official", username: "+62 823-3993-6682" },
  { icons: "/instagram-light.svg", name: "Instagram", username: "@mylindway" },
  { icons: "/facebook-light.svg", name: "Facebook", username: "mylindway" },
];

export const ContactUs = () => {
  return (
    <Background src="/images/contact-us-header-background.webp" alt="hero background" className="flex flex-col items-center min-h-150 bg-dark/30">
      <Header />
      <Motion tag="div" initialX={0} animateX={0} duration={0.3} className="w-full space-y-8 pt-20 pb-8 md:pb-0 md:pt-24 max-w-7xl px-4 sm:px-8">
        <div className="space-y-8">
          <div className="space-y-4 text-center">
            <Motion tag="h3" initialY={50} animateY={0} duration={0.3} className="text-2xl sm:text-3xl lg:text-4xl font-semibold">
              Where Heritage Meets Modern Grace
            </Motion>
            <Motion tag="p" initialY={50} animateY={0} duration={0.6} delay={0.3} className="text-base sm:text-lg max-w-2xl mx-auto">
              Celebrating timeless elegance and cultural craftsmanship in every moment. <br /> Follow us on Instagram @mylindway to explore more.
            </Motion>
          </div>
          <Motion tag="div" initialY={50} animateY={0} duration={0.9} delay={0.3} className="flex justify-between flex-wrap w-full gap-4">
            {contactUs.map((item, index) => (
              <div key={index} className="flex gap-2 items-center sm:whitespace-nowrap w-full sm:w-max">
                <Img src={`/icons/${item.icons}`} alt={item.name} className="size-8 shrink-0" />
                <div className="text-sm">
                  <p>{item.name}</p>
                  <p>{item.username}</p>
                </div>
              </div>
            ))}
          </Motion>
        </div>
      </Motion>
    </Background>
  );
};
