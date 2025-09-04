import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HelpCircle, Mail, MessageSquare, ExternalLink, BookOpen, Phone, Clock, Star, Search, MessageCircle, FileText, Users, Zap, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const SupportSection = () => {
  const faqs = [
    {
      question: "How do I change my password?",
      answer:
        "To change your password, go to the Security tab in your account settings. You'll need to verify your current password before setting a new one. We recommend using a strong, unique password for enhanced security.",
      category: "Account",
      helpful: true
    },
    {
      question: "Can I download my data?",
      answer:
        "Yes! You can request a full export of all your data from the Privacy & Data tab. The export will be prepared and emailed to you within 24 hours. This includes all your projects, images, and account information.",
      category: "Data",
      helpful: true
    },
    {
      question: "What happens if I exceed my storage limit?",
      answer:
        "If you exceed your storage limit, you won't be able to upload new files until you either free up space by deleting existing content or upgrade to a plan with more storage. We'll notify you when you're approaching your limit.",
      category: "Storage",
      helpful: false
    },
    {
      question: "How do I cancel my subscription?",
      answer:
        "You can cancel your subscription at any time from the Subscription tab. If you cancel, you'll still have access to premium features until the end of your current billing period. No questions asked.",
      category: "Billing",
      helpful: true
    },
    {
      question: "How do I share projects with team members?",
      answer:
        "To share a project, click on the project card and select 'Share'. You can invite team members by email, set permissions, and manage access levels. Shared projects sync in real-time across all team members.",
      category: "Collaboration",
      helpful: true
    },
    {
      question: "What file formats are supported?",
      answer:
        "We support all major image formats including JPEG, PNG, GIF, WebP, and TIFF. For videos, we support MP4, MOV, and AVI. Files are automatically optimized for web viewing while preserving quality.",
      category: "Files",
      helpful: false
    }
  ];

  const supportChannels = [
    {
      title: "Email Support",
      description: "Get detailed responses within 24 hours",
      icon: Mail,
      color: "from-[#3b82f6] to-[#1d4ed8]",
      action: "support@stillcolab.com",
      responseTime: "24 hours"
    },
    {
      title: "Live Chat",
      description: "Real-time assistance from our team",
      icon: MessageCircle,
      color: "from-[#16ad7c] to-[#10b981]",
      action: "Start Chat",
      responseTime: "Instant"
    },
    {
      title: "Help Center",
      description: "Comprehensive guides and tutorials",
      icon: BookOpen,
      color: "from-[#f59e0b] to-[#d97706]",
      action: "Browse Articles",
      responseTime: "Self-service"
    },
    {
      title: "Phone Support",
      description: "Speak directly with our experts",
      icon: Phone,
      color: "from-[#8b5cf6] to-[#7c3aed]",
      action: "Call Us",
      responseTime: "Business hours"
    }
  ];

  const quickActions = [
    { title: "Account Recovery", icon: Users, color: "from-[#16ad7c] to-[#10b981]" },
    { title: "Billing Issues", icon: FileText, color: "from-[#f59e0b] to-[#d97706]" },
    { title: "Technical Problems", icon: Zap, color: "from-[#3b82f6] to-[#1d4ed8]" },
    { title: "Feature Requests", icon: Star, color: "from-[#8b5cf6] to-[#a855f7]" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-[#2a2a2a] bg-gradient-to-br from-[#151515]/80 to-[#1a1a1a]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Enhanced Header */}
        <CardHeader className="border-b border-[#2a2a2a] pb-6 bg-gradient-to-r from-[#16ad7c]/5 to-[#5ce1e6]/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl flex items-center justify-center shadow-lg">
              <HelpCircle className="h-6 w-6 text-black" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Help & Support
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Get help with your account, subscription, and technical issues
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 space-y-8">
          {/* Search Support */}
          <motion.div
            className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#151515]/80 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm shadow-lg"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#16ad7c]/20 to-[#5ce1e6]/20 rounded-full flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-[#16ad7c]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">How can we help you?</h3>
                <p className="text-gray-400 text-sm">Search our knowledge base or browse common questions</p>
              </div>
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <Input
                    placeholder="Search for help articles, FAQs, or topics..."
                    className="pl-10 pr-4 bg-[#1a1a1a]/60 border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 transition-all duration-300"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#f59e0b]" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-4 rounded-xl backdrop-blur-sm hover:border-[#3a3a3a] transition-all duration-300 cursor-pointer"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-sm font-medium text-white">{action.title}</h4>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FAQ Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Frequently Asked Questions
                </h3>
              </div>

              <Accordion type="single" collapsible className="w-full space-y-3">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <AccordionItem
                      value={`item-${index}`}
                      className="border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 rounded-xl overflow-hidden"
                    >
                      <AccordionTrigger className="text-sm hover:text-[#16ad7c] transition-colors px-4 py-3">
                        <div className="flex items-center gap-3 text-left">
                          <Badge className={`text-xs px-2 py-1 ${faq.helpful
                            ? 'bg-gradient-to-r from-[#10b981]/20 to-[#059669]/20 border-[#10b981]/30 text-[#10b981]'
                            : 'bg-gradient-to-r from-[#f59e0b]/20 to-[#d97706]/20 border-[#f59e0b]/30 text-[#f59e0b]'
                            }`}>
                            {faq.category}
                          </Badge>
                          <span className="text-white">{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3 text-sm text-gray-400 bg-[#151515]/40">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>

              <Button
                variant="outline"
                className="w-full border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Full Help Center
              </Button>
            </div>

            {/* Contact Support Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Contact Support</h3>
              </div>

              <p className="text-gray-400 text-sm">
                Need additional help? Our support team is ready to assist you with any questions or issues. Choose the channel that works best for you.
              </p>

              <div className="space-y-4">
                {supportChannels.map((channel, index) => {
                  const IconComponent = channel.icon;

                  return (
                    <motion.div
                      key={channel.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#151515]/80 border border-[#2a2a2a] p-4 rounded-xl backdrop-blur-sm hover:border-[#3a3a3a] transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${channel.color} rounded-xl flex items-center justify-center shadow-lg`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-1">{channel.title}</h4>
                          <p className="text-sm text-gray-400 mb-2">{channel.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>Response time: {channel.responseTime}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                          onClick={() => {
                            if (channel.title === "Email Support") {
                              window.location.href = "mailto:support@stillcolab.com";
                            } else if (channel.title === "Live Chat") {
                              // Handle live chat
                              window.location.href = "mailto:support@stillcolab.com";
                            }
                          }}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          {channel.action}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Additional Support Info */}
              <motion.div
                className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-4 rounded-xl backdrop-blur-sm"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#f59e0b]/20 to-[#d97706]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="h-4 w-4 text-[#f59e0b]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Premium Support</h4>
                    <p className="text-xs text-gray-400 mb-3">
                      Upgrade to Pro or higher plans for priority support, faster response times, and dedicated assistance.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10 hover:border-[#f59e0b]/50 transition-all duration-300"
                    >
                      <ArrowRight className="h-3 w-3 mr-2" />
                      View Plans
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Support Stats */}
          <motion.div
            className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-white">Our Support Commitment</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#16ad7c]">24h</div>
                  <div className="text-xs text-gray-400">Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#5ce1e6]">98%</div>
                  <div className="text-xs text-gray-400">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#8b5cf6]">24/7</div>
                  <div className="text-xs text-gray-400">Availability</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#f59e0b]">5min</div>
                  <div className="text-xs text-gray-400">Live Chat</div>
                </div>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
