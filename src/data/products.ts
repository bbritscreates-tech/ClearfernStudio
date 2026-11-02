
export type ShopProduct = {
  slug: string;
  category: string;
  name: string;
  description: string;
  price: string;
  style: string;
  label: string;
  longDescription: string;
  includes: string[];
  format: string;
  suitableFor: string;
};

export const products: ShopProduct[] = [
  {
    slug: "the-weekly-reset",
    category: "PLANNING",
    name: "The Weekly Reset",
    description: "A little more clarity for the week ahead.",
    price: "Coming soon",
    style: "product-planner",
    label: "WEEKLY PLANNER",
    longDescription:
      "Create a little breathing room in your week with a planning tool designed to help you focus on what matters, organise your priorities and approach each day with more intention.",
    includes: [
      "A weekly planning layout",
      "Space for priorities and tasks",
      "A simple, considered design",
    ],
    format: "Digital format to be confirmed before launch.",
    suitableFor:
      "Anyone who wants a calmer, more organised approach to the week.",
  },
  {
    slug: "the-content-edit",
    category: "CREATIVE",
    name: "The Content Edit",
    description: "Make showing up online feel easier.",
    price: "Coming soon",
    style: "product-social",
    label: "SOCIAL MEDIA KIT",
    longDescription:
      "Bring more consistency to your online presence with a creative resource designed to make planning and presenting your content feel more manageable.",
    includes: [
      "Social media design resources",
      "A consistent visual direction",
      "Tools to support content creation",
    ],
    format: "Digital format and template compatibility to be confirmed.",
    suitableFor:
      "Small businesses, creators and anyone building a brand online.",
  },
  {
    slug: "the-small-business-toolkit",
    category: "BUSINESS",
    name: "The Small Business Toolkit",
    description: "Bring a little more structure to your business.",
    price: "Coming soon",
    style: "product-business",
    label: "BUSINESS WORKBOOK",
    longDescription:
      "Give your ideas a little more structure with a practical business resource intended to help you organise your thinking and take manageable next steps.",
    includes: [
      "Business planning prompts",
      "Space to organise ideas",
      "Practical planning resources",
    ],
    format: "Digital format to be confirmed before launch.",
    suitableFor:
      "Small business owners and people developing a new business idea.",
  },
];
