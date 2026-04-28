import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

const SERVICES = [
  "Business Formation",
  "Delaware Infrastructure",
  "Accounting & Financial Operations",
  "Tax & Compliance",
  "Legal & Corporate Support",
  "Risk Management & Insurance",
  "Business Advisory",
  "Branding & Business Identity",
];

const Intake = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [incorporationState, setIncorporationState] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [nonMarketingConsent, setNonMarketingConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("intake_submissions").insert({
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      company_name: companyName || null,
      incorporation_state: incorporationState || null,
      services_of_interest: selectedServices,
      explanation: explanation || null,
      non_marketing_consent: nonMarketingConsent,
      marketing_consent: marketingConsent,
    });
    setLoading(false);
    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-3">
            <div className="text-5xl text-primary">✓</div>
            <h2 className="text-xl font-bold">Thank you!</h2>
            <p className="text-muted-foreground">
              We received your information and will be in touch within 24–48 business hours.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">SGS Consulting Group</h1>
          <p className="text-muted-foreground mt-2">Tell us about you and your business</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Company */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label>State of Incorporation</Label>
                <Select value={incorporationState} onValueChange={setIncorporationState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state…" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Services */}
              <div className="space-y-3">
                <Label>Services of Interest</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SERVICES.map((service) => (
                    <div key={service} className="flex items-center gap-2">
                      <Checkbox
                        id={service}
                        checked={selectedServices.includes(service)}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <Label htmlFor={service} className="font-normal cursor-pointer">
                        {service}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <Label htmlFor="explanation">Tell us more about your needs</Label>
                <Textarea
                  id="explanation"
                  rows={4}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>

              {/* Consent */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="nonMarketingConsent"
                    checked={nonMarketingConsent}
                    onCheckedChange={(v) => setNonMarketingConsent(v === true)}
                  />
                  <Label htmlFor="nonMarketingConsent" className="font-normal text-sm leading-relaxed cursor-pointer">
                    I consent to receive non-marketing text messages from SGS Consulting Group.
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="marketingConsent"
                    checked={marketingConsent}
                    onCheckedChange={(v) => setMarketingConsent(v === true)}
                  />
                  <Label htmlFor="marketingConsent" className="font-normal text-sm leading-relaxed cursor-pointer">
                    I consent to receive marketing and promotional messages from SGS Consulting Group.
                  </Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting…" : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Intake;
