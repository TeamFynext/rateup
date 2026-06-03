import { Image } from "@unpic/react";
import type { Variants } from "motion/react";
import { motion } from "motion/react";

import { imagePath } from "@/components/HomePage/pages/constants.tsx";
import { sora } from "@/utils/fonts.ts";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariantsLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardVariantsRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const imageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Features() {
  return (
    <motion.section
      className={`${sora.className} flex items-center justify-center p-4 bg-white`}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      variants={containerVariants}
    >
      <div className="max-w-6xl flex flex-col items-center justify-center gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.div
            className="border border-rateup-light-blue rounded-xl col-span-2 flex flex-col justify-center items-start gap-2"
            variants={cardVariantsLeft}
            whileHover={{ y: -6, scale: 1.008 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="px-8 py-6">
              <span className="text-rateup-graytext text-xl font-semibold">
                Campaign Management
              </span>
              <p className="text-grey-color-6 text-xs font-normal">
                Turn Campaigns into Conversations / Conversations That Sell.
                Send promos, reminders, or surveys in minutes—no tech skills
                needed. Manage campaigns across channels with ease.
              </p>
            </div>

            <motion.div variants={imageVariants} className="w-full">
              <Image
                src={`${imagePath}/homepage/campaignmanagement.png`}
                alt="Campaign management"
                width={600}
                height={600}
                className="w-full h-auto object-contain rounded-br-xl"
                priority
              />
            </motion.div>
          </motion.div>

          <motion.div
            className="border border-rateup-light-blue rounded-xl flex flex-col justify-center items-start gap-2"
            variants={cardVariantsRight}
            whileHover={{ y: -6, scale: 1.008 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="px-8 py-6">
              <span className="text-rateup-graytext text-xl font-semibold">
                WhatsApp Business API
              </span>
              <p className="text-grey-color-6 text-xs font-normal">
                Official WhatsApp Business API integration with bulk messaging,
                templates, and automated responses.
              </p>
            </div>
            <motion.div variants={imageVariants} className="w-full">
              <Image
                src={`${imagePath}/homepage/whatsappbusinessapi.svg`}
                alt="WhatsApp Business API"
                width={600}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />
            </motion.div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.div
            className="border border-rateup-light-blue rounded-xl flex flex-col justify-center items-start gap-2"
            variants={cardVariantsLeft}
            whileHover={{ y: -6, scale: 1.008 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="px-8 py-6">
              <span className="text-rateup-graytext text-xl font-semibold">
                Ticketing & Escalation
              </span>
              <p className="text-grey-color-6 text-xs font-normal">
                Convert support inquiries and complaints into trackable tickets
                that can be automatically or manually assigned to team members.
              </p>
            </div>
            <motion.div variants={imageVariants} className="w-full">
              <Image
                src={`${imagePath}/homepage/ticketandescalation.svg`}
                alt="Ticketing and escalation"
                width={600}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />
            </motion.div>
          </motion.div>

          <motion.div
            className="border border-rateup-light-blue rounded-xl col-span-2 flex flex-col justify-center items-start gap-2"
            variants={cardVariantsRight}
            whileHover={{ y: -6, scale: 1.008 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="px-8 py-6">
              <span className="text-rateup-graytext text-xl font-semibold">
                Multi-branch
              </span>
              <p className="text-grey-color-6 text-xs font-normal">
                Super admins can add unlimited branches, track performance, and
                compare results across teams. Branch members see only their own
                activities, while admins oversee everything —ensuring service
                quality and efficiency.
              </p>
            </div>
            <motion.div variants={imageVariants} className="w-full">
              <Image
                src={`${imagePath}/homepage/multibranch.svg`}
                alt="Multi-branch"
                width={600}
                height={600}
                className="w-full h-auto object-contain rounded-br-xl"
                priority
              />
            </motion.div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.div
            className="border border-rateup-light-blue rounded-xl col-span-2 flex flex-col justify-center items-start gap-2"
            variants={cardVariantsLeft}
            whileHover={{ y: -6, scale: 1.008 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="px-8 py-6">
              <span className="text-rateup-graytext text-xl font-semibold">
                WhatsApp Flow
              </span>
              <p className="text-grey-color-6 text-xs font-normal">
                Build smart, automated workflows that respond instantly,
                personalize conversations, and move customers from hello to
                purchase — effortlessly.
              </p>
            </div>
            <motion.div variants={imageVariants} className="w-full">
              <Image
                src={`${imagePath}/homepage/whatsappflow.svg`}
                alt="WhatsApp Flow"
                width={600}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />
            </motion.div>
          </motion.div>

          <motion.div
            className="border border-rateup-light-blue rounded-xl p-4"
            variants={cardVariantsRight}
            whileHover={{ y: -6, scale: 1.008 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div>
              <span className="text-rateup-graytext text-xl font-semibold">
                QR Codes: Offline → Online
              </span>
              <p className="text-grey-color-6 text-xs font-normal">
                Turn receipts, posters, or tables into digital touchpoints for
                offers, feedback, or loyalty sign-ups.
              </p>
            </div>
            <motion.div variants={imageVariants} className="w-full mt-2">
              <Image
                src={`${imagePath}/homepage/qrcode.svg`}
                alt="QR Codes"
                width={600}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
