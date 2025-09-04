import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CreditCard, CheckCircle, Clock, Calendar, Tag, Star, Loader2, Crown, Zap, Shield, Sparkles, ArrowRight, Check, AlertCircle } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export const SubscriptionSection = () => {
  const { user, refreshUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  // Check for success or canceled parameters for Stripe redirect
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success("Payment successful! Your subscription is being processed.");
      verifySubscription();
    } else if (canceled === 'true') {
      toast.info("Payment canceled. You can try again whenever you're ready.");
    }
  }, [searchParams]);

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .order('price_cents', { ascending: true });

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
        toast.error("Failed to load subscription plans");
      }
    };

    fetchPlans();
  }, []);

  if (!user) return null;

  // Format subscription name for display
  const formatPlanName = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const planFeatures = {
    starter: ["1GB Storage", "Up to 8 Projects", "Unlimited Shared Projects", "1 User"],
    creator: ["30GB Storage", "Up to 100 Projects", "Unlimited Shared Projects", "Priority Support", "1 User"],
    pro: ["100GB Storage", "Unlimited Projects", "Unlimited Shared Projects", "Priority Support", "1 User"],
    custom: ["Customized Storage (1TB+)", "Unlimited Projects", "Unlimited Shared Projects", "Dedicated Support", "Multi Users"]
  };

  const features = planFeatures[user.subscriptionPlan as keyof typeof planFeatures];

  // Verify subscription status with the backend
  const verifySubscription = async () => {
    try {
      setCheckingSubscription(true);
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;

      if (data.subscribed) {
        toast.success(`Subscription verified: ${data.subscription_tier} plan active`);
        // Refresh user data to get the updated subscription
        if (refreshUser) await refreshUser();
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
      toast.error("Failed to verify subscription status");
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Handle upgrade/payment flow
  const handleUpgradeClick = async (planId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId }
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error("Failed to start the upgrade process. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get plan icon and color
  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free': return { icon: Shield, color: 'from-[#6366f1] to-[#8b5cf6]' };
      case 'starter': return { icon: Zap, color: 'from-[#16ad7c] to-[#10b981]' };
      case 'creator': return { icon: Star, color: 'from-[#f59e0b] to-[#d97706]' };
      case 'pro': return { icon: Crown, color: 'from-[#16ad7c] to-[#5ce1e6]' };
      default: return { icon: Sparkles, color: 'from-[#8b5cf6] to-[#a855f7]' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-[#2a2a2a] bg-gradient-to-br from-[#151515]/80 to-[#1a1a1a]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Enhanced Header */}
        <CardHeader className="border-b border-[#2a2a2a] pb-6 bg-gradient-to-r from-[#16ad7c]/5 to-[#109d73]/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#109d73] rounded-xl flex items-center justify-center shadow-lg">
              <CreditCard className="h-6 w-6 text-black" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Subscription Plan
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Manage your subscription, billing, and plan features
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 space-y-8">
          <div className="flex flex-col lg:flex-row items-start gap-8">
            {/* Current Plan Section */}
            <div className="space-y-6 w-full lg:w-1/2">
              <motion.div
                className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#151515]/80 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm shadow-lg"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getPlanIcon(user.subscriptionPlan).color} rounded-xl flex items-center justify-center shadow-lg`}>
                      {(() => {
                        const IconComponent = getPlanIcon(user.subscriptionPlan).icon;
                        return <IconComponent className="h-6 w-6 text-white" />;
                      })()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {formatPlanName(user.subscriptionPlan)} Plan
                        {user.subscriptionPlan !== 'free' && (
                          <Badge className="bg-gradient-to-r from-[#16ad7c]/20 to-[#5ce1e6]/20 border-[#16ad7c]/30 text-[#16ad7c] text-xs px-2 py-1">
                            Current
                          </Badge>
                        )}
                      </h3>
                      <p className="text-gray-400 text-sm">Billing Monthly</p>
                    </div>
                  </div>
                  {user.subscriptionPlan === 'pro' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-full flex items-center justify-center">
                      <Crown className="h-4 w-4 text-black" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {features?.map((feature, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-3 text-sm"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {user.subscriptionPlan !== 'free' && (
                  <div className="pt-4 border-t border-[#2a2a2a]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-[#5ce1e6]" />
                        <span className="text-gray-400">Renews on</span>
                      </div>
                      <span className="text-white font-medium">Nov 15, 2023</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Plan Benefits */}
              <div className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-4 rounded-xl backdrop-blur-sm">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#f59e0b]" />
                  Plan Benefits
                </h4>
                <div className="space-y-2 text-xs text-gray-400">
                  <p>• Priority customer support</p>
                  <p>• Advanced collaboration features</p>
                  <p>• Enhanced security options</p>
                  <p>• Early access to new features</p>
                </div>
              </div>
            </div>

            {/* Available Plans Section */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#151515]/80 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-[#16ad7c]" />
                  Available Plans
                </h3>

                {plans.length > 0 ? (
                  <div className="space-y-4">
                    {plans.map((plan, index) => {
                      const isCurrentPlan = formatPlanName(user.subscriptionPlan).toLowerCase() === plan.name.toLowerCase();
                      const planIcon = getPlanIcon(plan.name);

                      return (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className={`p-4 border rounded-xl transition-all duration-300 ${isCurrentPlan
                              ? 'border-[#16ad7c] bg-gradient-to-r from-[#16ad7c]/10 to-[#5ce1e6]/10'
                              : 'border-[#2a2a2a] hover:border-[#16ad7c]/50 hover:bg-[#1a1a1a]/40'
                            }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 bg-gradient-to-br ${planIcon.color} rounded-lg flex items-center justify-center`}>
                                {(() => {
                                  const IconComponent = planIcon.icon;
                                  return <IconComponent className="h-4 w-4 text-white" />;
                                })()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{plan.name} Plan</h4>
                                <div className="text-sm text-gray-400">
                                  {plan.price_cents === 0
                                    ? 'Free'
                                    : `$${(plan.price_cents / 100).toFixed(2)}/${plan.stripe_price_id ? 'month' : 'one-time'}`}
                                </div>
                              </div>
                            </div>

                            {isCurrentPlan ? (
                              <Badge className="bg-gradient-to-r from-[#16ad7c]/20 to-[#5ce1e6]/20 border-[#16ad7c]/30 text-[#16ad7c] text-xs px-3 py-1">
                                Current Plan
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleUpgradeClick(plan.id)}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
                              >
                                {isLoading ? (
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                  </div>
                                ) : (
                                  'Upgrade'
                                )}
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading plans...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <AlertCircle className="w-8 h-8 mx-auto text-gray-500" />
                        <p>No plans available at the moment.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 mt-4 text-center text-xs text-gray-400 border-t border-[#2a2a2a]">
                  <p>All plans include our base features. Upgrade for additional storage and premium features.</p>
                </div>
              </div>

              {/* Subscription Verification section */}
              <motion.div
                className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-4 rounded-xl backdrop-blur-sm"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                    <p className="text-sm text-gray-400">Having issues with your subscription?</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={verifySubscription}
                    disabled={checkingSubscription}
                    className="whitespace-nowrap border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                  >
                    {checkingSubscription ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </div>
                    ) : (
                      'Verify Subscription'
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
