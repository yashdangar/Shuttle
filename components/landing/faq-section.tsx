"use client"

import { useState } from "react"

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "What is Shuttle and who is it for?",
    answer:
      "Shuttle is a comprehensive shuttle management platform for hotels and resorts. It's perfect for hospitality businesses that want to streamline their transportation operations, manage fleets efficiently, and provide exceptional guest experiences with real-time tracking and automated bookings.",
  },
  {
    question: "How does real-time tracking work?",
    answer:
      "Our platform provides live GPS tracking for all your shuttles through driver mobile apps. Guests can see real-time shuttle locations and accurate ETAs, while managers can monitor fleet status, driver locations, and route efficiency from their dashboard.",
  },
  {
    question: "What are the booking features and how do they help?",
    answer:
      "Shuttle offers automated guest booking management with QR code verification, flexible scheduling, and seamless payment integration. This reduces manual work, prevents booking conflicts, and provides guests with a modern, convenient reservation experience.",
  },
  {
    question: "Can drivers use the system on mobile devices?",
    answer:
      "Yes! Shuttle includes a dedicated mobile app for drivers with route navigation, guest pickup details, schedule management, and real-time communication. The app works offline for route guidance and syncs data when connectivity is available.",
  },
  {
    question: "How does route optimization work?",
    answer:
      "Our intelligent route optimization analyzes multiple factors including guest locations, traffic conditions, and vehicle capacity to create efficient routes. This reduces fuel costs, minimizes wait times, and maximizes shuttle utilization.",
  },
  {
    question: "Is our guest and operational data secure?",
    answer:
      "Absolutely. We use enterprise-grade security measures including end-to-end encryption for data transmission, secure cloud storage, role-based access controls, and regular security audits. Your guest information and operational data remain private and compliant with hospitality industry standards.",
  },
]

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  return (
    <div className="w-full flex justify-center items-start">
      <div className="flex-1 px-4 md:px-12 py-16 md:py-20 flex flex-col lg:flex-row justify-start items-start gap-6 lg:gap-12">
        {/* Left Column - Header */}
        <div className="w-full lg:flex-1 flex flex-col justify-center items-start gap-4 lg:py-5">
          <div className="w-full flex flex-col justify-center text-[#49423D] font-semibold leading-tight md:leading-[44px] font-sans text-4xl tracking-tight">
            Frequently Asked Questions
          </div>
          <div className="w-full text-[#605A57] text-base font-normal leading-7 font-sans">
            Manage your fleet, track shuttles,
            <br className="hidden md:block" />
            and delight your guests.
          </div>
        </div>

        {/* Right Column - FAQ Items */}
        <div className="w-full lg:flex-1 flex flex-col justify-center items-center">
          <div className="w-full flex flex-col">
            {faqData.map((item, index) => {
              const isOpen = openItems.includes(index)

              return (
                <div key={index} className="w-full border-b border-[rgba(73,66,61,0.16)] overflow-hidden">
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-5 py-[18px] flex justify-between items-center gap-5 text-left hover:bg-[rgba(73,66,61,0.02)] transition-colors duration-200"
                    aria-expanded={isOpen}
                  >
                    <div className="flex-1 text-[#49423D] text-base font-medium leading-6 font-sans">
                      {item.question}
                    </div>
                    <div className="flex justify-center items-center">
                      <ChevronDownIcon
                        className={`w-6 h-6 text-[rgba(73,66,61,0.60)] transition-transform duration-300 ease-in-out ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-5 pb-[18px] text-[#605A57] text-sm font-normal leading-6 font-sans">
                      {item.answer}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
