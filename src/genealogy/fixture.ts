/**
 * The document the model's tests read. It is deliberately awkward: a family
 * that resolves, a person carrying nothing but a name, a record declaring no
 * identifier, pointers that lead nowhere, a spouse whose sex disagrees with
 * the role naming them, two people in one role, and a pointer in a role that
 * is neither spouse nor child.
 */
export const FIXTURE = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",

  // A full person: names, sex, events in record order, both families.
  "0 @I1@ INDI",
  "1 NAME Marie /Skłodowska-Curie/",
  "1 NAME Maria Salomea /Skłodowska/",
  "1 SEX F",
  "1 BIRT",
  "2 DATE 7 NOV 1867",
  "2 PLAC Warsaw, Congress Poland",
  "1 OCCU Physicist and chemist",
  "1 CENS",
  "2 DATE 1891",
  "1 DEAT",
  "2 DATE 4 JUL 1934",
  "2 PLAC Passy, France",
  "1 FAMC @F1@",
  "1 FAMS @F2@",
  "1 SOUR @S1@",

  // Her parents.
  "0 @I2@ INDI",
  "1 NAME Władysław /Skłodowski/",
  "1 SEX M",
  "1 BIRT",
  "2 DATE ABT 1832",
  "0 @I3@ INDI",
  "1 NAME Bronisława /Boguska/",
  "1 SEX F",

  // Her husband, and their two children.
  "0 @I4@ INDI",
  "1 NAME Pierre /Curie/",
  "1 SEX M",
  "1 FAMS @F2@",
  "0 @I5@ INDI",
  "1 NAME Irène /Joliot-Curie/",
  "1 FAMC @F2@",
  "0 @I6@ INDI",
  "1 NAME Ève /Curie/",
  "1 FAMC @F2@",

  // A person whose picture is a face inside a group photograph, a second
  // picture that is a sound recording, and a pointer to a record that is not
  // declared.
  "0 @I12@ INDI",
  "1 NAME Pictured /Person/",
  "1 OBJE @O1@",
  "2 CROP",
  "3 TOP 10",
  "3 LEFT 20",
  "3 HEIGHT 30",
  "3 WIDTH 40",
  "2 TITL Second from the left",
  "1 OBJE @O2@",
  "1 OBJE @O9@",
  "0 @O1@ OBJE",
  "1 FILE Media/family.svg",
  "2 FORM image/svg+xml",
  "0 @O2@ OBJE",
  "1 FILE Media/interview.mp3",
  "2 FORM audio/mpeg",

  // A record naming its file on the spot rather than through a record.
  "0 @I13@ INDI",
  "1 NAME Inline /Picture/",
  "1 OBJE",
  "2 FILE Media/inline.jpg",
  "2 FORM image/jpeg",

  // The sound recording comes first, so "the first one" is not the same
  // answer as "the first image".
  "0 @I15@ INDI",
  "1 NAME Sound /First/",
  "1 OBJE @O2@",
  "1 OBJE @O4@",
  "0 @O4@ OBJE",
  "1 FILE Media/portrait.png",
  "2 FORM image/png",

  // A rectangle missing a side, which is not a rectangle.
  "0 @I16@ INDI",
  "1 NAME Partial /Crop/",
  "1 OBJE @O4@",
  "2 CROP",
  "3 TOP 10",
  "3 LEFT 20",
  "3 HEIGHT 30",

  // A picture at a web address, which must never be fetched to draw a page.
  "0 @I14@ INDI",
  "1 NAME Remote /Picture/",
  "1 OBJE @O3@",
  "0 @O3@ OBJE",
  "1 FILE https://example.org/portrait.jpg",
  "2 FORM image/jpeg",

  // A person with nothing but a name.
  "0 @I7@ INDI",
  "1 NAME Anonymous /Cousin/",

  // A person pointing at a family that is not declared.
  "0 @I8@ INDI",
  "1 NAME Lost /Relation/",
  "1 FAMC @F99@",

  // A record declaring no identifier at all.
  "0 INDI",
  "1 NAME Nameless /Record/",

  // A death with nothing under it, and a date in another calendar.
  "0 @I9@ INDI",
  "1 NAME Bare /Death/",
  "1 DEAT",
  "1 BURI",
  "2 DATE @#DHEBREW@ 5628",

  // Two people in one spouse role, and a sex that disagrees with its role.
  "0 @I10@ INDI",
  "1 NAME First /Spouse/",
  "1 SEX F",
  "1 FAMS @F3@",
  "0 @I11@ INDI",
  "1 NAME Second /Spouse/",
  "1 SEX F",
  "1 FAMS @F3@",

  // Her parents' family.
  "0 @F1@ FAM",
  "1 HUSB @I2@",
  "1 WIFE @I3@",
  "1 CHIL @I1@",

  // Her own family, with a child the document does not declare, and an
  // associate, which is a pointer to a person in neither family role.
  "0 @F2@ FAM",
  "1 MARR",
  "2 DATE 26 JUL 1895",
  "2 PLAC Sceaux, France",
  "1 HUSB @I4@",
  "1 WIFE @I1@",
  "1 CHIL @I5@",
  "1 CHIL @I6@",
  "1 CHIL @I99@",
  "1 ASSO @I7@",
  "2 ROLE WITN",

  // Two wives, and a husband recorded female.
  "0 @F3@ FAM",
  "1 HUSB @I10@",
  "1 WIFE @I11@",

  // A family that records only the people in it: no marriage, no child.
  "0 @F4@ FAM",
  "1 HUSB @I2@",
  "1 WIFE @I3@",

  // A family naming a spouse the document does not declare.
  "0 @F5@ FAM",
  "1 HUSB @I98@",
  "1 WIFE @I4@",

  // A family naming nobody at all.
  "0 @F6@ FAM",
  "1 MARR",

  // Sources: one stating everything, one a title only, one with no title at
  // all, and one naming a repository the document does not declare.
  "0 @S1@ SOUR",
  "1 TITL Parish registers of Warsaw",
  "1 AUTH Parish of the Holy Cross",
  "1 PUBL Warsaw, 1867",
  "1 REPO @R1@",
  "1 OBJE @O4@",
  "0 @S2@ SOUR",
  "1 TITL A title and nothing else",
  "0 @S3@ SOUR",
  "1 AUTH Anonymous",
  "0 @S4@ SOUR",
  "1 TITL Held nowhere the file declares",
  "1 REPO @R9@",
  // The address sits beside the name, not beneath it, and carries its own
  // lines, which is how both GEDCOM versions write a repository's address.
  "0 @R1@ REPO",
  "1 NAME State Archive in Warsaw",
  "1 ADDR Krzywe Koło 7",
  "2 CITY Warsaw",
  "2 CTRY Poland",
  "1 WWW https://example.org/archive",

  // A person citing one source on the record and another under an event, and
  // one citing a source the document does not declare.
  "0 @I17@ INDI",
  "1 NAME Cited /Person/",
  "1 SOUR @S1@",
  "2 PAGE volume 3, page 214",
  "1 BIRT",
  "2 DATE 1867",
  "2 SOUR @S1@",
  "3 PAGE birth entry 88",
  "1 SOUR @S9@",
  "0 @I18@ INDI",
  "1 NAME Second /Citer/",
  "1 SOUR @S1@",
  "0 @I19@ INDI",
  "1 NAME Third /Citer/",
  "1 SOUR @S1@",

  // A family declaring no identifier.
  "0 FAM",
  "1 HUSB @I2@",

  "0 TRLR",
  "",
].join("\n");
